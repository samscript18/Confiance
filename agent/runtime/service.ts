import {
  readRecord,
  writeRecord,
  recordNames,
} from "../../packages/shared/storage.js";
import { acquirePayrollLease } from "../../packages/shared/lease.js";
import { connectPrivy } from "../wallet/privy.js";
import { address, required } from "../../packages/shared/config.js";
import { encodeFunctionData, erc20Abi } from "viem";
import { confianceAbi } from "../../packages/shared/contracts.js";
import { parseExactAmount } from "../tools/amount.js";
import { createPublicClient, http, isHex } from "viem";
import { createPayrollTools } from "../tools/payroll.js";
import { runPayroll, validateToolCall } from "./llm.js";
import {
  assertMonad,
  json,
  rpcUrl,
  targetChain,
} from "../../packages/shared/config.js";
import { join } from "node:path";
import { verifyConfiguredPayment } from "../proofs.js";
import { payrollTaskId } from "../task.js";

/** Shared durable lease and receipt reconciliation prevent overlapping payroll executions. */
export async function runConfiguredPayroll(env: NodeJS.ProcessEnv) {
  const folder = join(env.CONFIANCE_PROJECT_ROOT || process.cwd(), "proofs");
  const lease = await acquirePayrollLease(env);
  try {
    const client = createPublicClient({
      chain: targetChain,
      transport: http(rpcUrl(env)),
    });
    assertMonad(await client.getChainId());
    const taskId = payrollTaskId(env);
    const completedPath = join(folder, `task-${taskId}.json`);
    try {
      const done: unknown = await readRecord(completedPath);
      if (
        done &&
        typeof done === "object" &&
        "hash" in done &&
        typeof done.hash === "string" &&
        isHex(done.hash)
      ) {
        await verifyConfiguredPayment(env, done.hash);
        return {
          status: "already_paid",
          transactionHash: done.hash,
          transcript: [
            {
              kind: "tool",
              name: "task_receipt",
              content: json({
                status: "already_paid",
                transactionHash: done.hash,
              }),
            },
          ],
        };
      }
      if (done !== undefined) throw new Error("Invalid completed task proof.");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw error;
    }
    for (const file of await recordNames(folder)) {
      if (!/^0x[0-9a-f]{64}\.json$/i.test(file)) continue;
      const proof: unknown = await readRecord(join(folder, file));
      if (!proof || typeof proof !== "object" || !("status" in proof)) continue;
      if (
        proof.status === "executed" &&
        "taskId" in proof &&
        "taskId" in proof &&
        proof.taskId === taskId
      ) {
        const hash = file.slice(0, -5);
        if (!isHex(hash)) throw new Error("Invalid task proof.");
        await verifyConfiguredPayment(env, hash);
        await writeRecord(completedPath, { hash, taskId });
        return {
          status: "already_paid",
          transactionHash: hash,
          transcript: [
            {
              kind: "tool",
              name: "task_receipt",
              content: json({ status: "already_paid", transactionHash: hash }),
            },
          ],
        };
      }
      if (
        proof.status === "mined_requires_audit" &&
        (!("taskId" in proof) || proof.taskId !== taskId)
      )
        throw new Error(
          "Interrupted payment for another task requires proof review.",
        );
      if (
        proof.status === "mined_requires_audit" &&
        "taskId" in proof &&
        proof.taskId === taskId
      ) {
        const hash = file.slice(0, -5);
        if (!isHex(hash)) throw new Error("Invalid payment hash.");
        await verifyConfiguredPayment(env, hash);
        await writeRecord(completedPath, { hash, taskId });
        await writeRecord(join(folder, file), {
          ...proof,
          status: "executed",
          transactionHash: hash,
        });
        return {
          status: "already_paid",
          transactionHash: hash,
          transcript: [],
        };
      }
      if (proof.status !== "submitted") continue;
      const hash = file.slice(0, -5);
      if (!isHex(hash)) throw new Error("Invalid pending proof.");
      const receipt = await client
        .getTransactionReceipt({ hash })
        .catch(() => undefined);
      if (!receipt)
        throw new Error(
          "A submitted payment has no receipt yet. Wait and reconcile before another run.",
        );
      await writeRecord(join(folder, file), {
        ...proof,
        status:
          receipt.status === "success" ? "mined_requires_audit" : "reverted",
        blockNumber: receipt.blockNumber,
      });
      // A success whose exact execution proof was interrupted needs explicit review.
      if (receipt.status === "success") {
        if (!("taskId" in proof) || proof.taskId !== taskId)
          throw new Error(
            "An interrupted payment for another task requires review.",
          );
        await verifyConfiguredPayment(env, hash);
        await writeRecord(completedPath, { hash, taskId });
        await writeRecord(join(folder, file), {
          ...proof,
          status: "executed",
          transactionHash: hash,
        });
        return {
          status: "already_paid",
          transactionHash: hash,
          transcript: [],
        };
      }
    }
    const intent = await readRecord(join(folder, `intent-${taskId}.json`));
    if (intent !== undefined) {
      if (!intent || typeof intent !== "object")
        throw new Error("Invalid durable payment intent.");
      const v = intent as Record<string, unknown>;
      if (
        typeof v.nonce !== "string" ||
        !/^\d+$/.test(v.nonce) ||
        typeof v.generation !== "string" ||
        !/^\d+$/.test(v.generation) ||
        typeof v.gas !== "string" ||
        !/^\d+$/.test(v.gas) ||
        typeof v.id !== "string" ||
        typeof v.data !== "string" ||
        !isHex(v.data)
      )
        throw new Error("Invalid durable payment intent.");
      const signer = await connectPrivy(env);
      const account = address(env, "CONFIANCE_ADDRESS"),
        asset = address(env, "PAYMENT_ASSET"),
        recipient = address(env, "PAYMENT_RECIPIENT");
      const decimals = await client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "decimals",
      });
      const expected = encodeFunctionData({
        abi: confianceAbi,
        functionName: "executePayment",
        args: [
          recipient,
          asset,
          parseExactAmount(required(env, "PAYMENT_AMOUNT"), decimals),
          BigInt(v.nonce),
          BigInt(v.generation),
        ],
      });
      const expectedId = `${targetChain.id}-${account}-${signer.address}-${v.generation}-${v.nonce}`;
      if (
        v.taskId !== taskId ||
        v.account !== account ||
        v.agent !== signer.address ||
        v.data !== expected ||
        v.id !== expectedId
      )
        throw new Error("Intent differs from the authorized task.");
      await lease.assertHeld();
      // Reuse the exact Privy idempotency key; never create fresh calldata after a crash.
      const hash = await signer.submitPayment(
        account,
        expected,
        BigInt(v.gas),
        expectedId,
      );
      const receipt = await client.waitForTransactionReceipt({
        hash,
        confirmations: 2,
        timeout: 120000,
      });
      if (receipt.status !== "success") {
        await writeRecord(join(folder, `${hash}.json`), {
          status: "reverted",
          hash,
          taskId,
          blockNumber: String(receipt.blockNumber),
        });
        return { status: "reverted", transactionHash: hash, transcript: [] };
      }
      await verifyConfiguredPayment(env, hash);
      await writeRecord(completedPath, { hash, taskId });
      await writeRecord(join(folder, `${hash}.json`), {
        status: "executed",
        transactionHash: hash,
        taskId,
      });
      return {
        status: "already_paid",
        transactionHash: hash,
        transcript: [
          {
            kind: "tool",
            name: "task_receipt",
            content: json({ status: "already_paid", transactionHash: hash }),
          },
        ],
      };
    }
    const payroll = await createPayrollTools(env, lease.assertHeld);
    const transcript = await runPayroll(env, async (name, args) => {
      try {
        const result = await payroll.tools[validateToolCall(name, args)]();
        if (
          name === "request_payment" &&
          result &&
          typeof result === "object" &&
          "status" in result &&
          result.status === "executed" &&
          "transactionHash" in result
        )
          await writeRecord(completedPath, {
            hash: result.transactionHash,
            taskId,
          });
        return json(result);
      } catch {
        return json({
          status: "unavailable",
          message:
            "Tool failed or input was rejected. No payment success is claimed.",
        });
      }
    });
    return { owner: payroll.owner, agent: payroll.agent, transcript };
  } finally {
    await lease.release();
  }
}
