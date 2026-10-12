import {
  mkdir,
  open,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
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

/** Single-worker MVP: durable lock and pending-proof reconciliation prevent overlapping runs. */
export async function runConfiguredPayroll(env: NodeJS.ProcessEnv) {
  const folder = join(env.CONFIANCE_PROJECT_ROOT || process.cwd(), "proofs");
  await mkdir(folder, { recursive: true });
  const lockPath = join(folder, "payroll.lock");
  const lock = await open(lockPath, "wx").catch(() => {
    throw new Error(
      "Payroll is already running or an interrupted run requires reconciliation.",
    );
  });
  try {
    const client = createPublicClient({
      chain: targetChain,
      transport: http(rpcUrl(env)),
    });
    assertMonad(await client.getChainId());
    const taskId = payrollTaskId(env);
    const completedPath = join(folder, `task-${taskId}.json`);
    try {
      const done: unknown = JSON.parse(await readFile(completedPath, "utf8"));
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
      throw new Error("Invalid completed task proof.");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw error;
    }
    for (const file of await readdir(folder)) {
      if (!/^0x[0-9a-f]{64}\.json$/i.test(file)) continue;
      const proof: unknown = JSON.parse(
        await readFile(join(folder, file), "utf8"),
      );
      if (!proof || typeof proof !== "object" || !("status" in proof)) continue;
      if (
        proof.status === "executed" &&
        "taskId" in proof &&
        proof.taskId === taskId
      ) {
        const hash = file.slice(0, -5);
        if (!isHex(hash)) throw new Error("Invalid task proof.");
        await verifyConfiguredPayment(env, hash);
        await writeFile(completedPath, json({ hash, taskId }));
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
      if (proof.status === "mined_requires_audit")
        throw new Error(
          "Interrupted successful payment requires proof review.",
        );
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
      await writeFile(
        join(folder, file),
        json({
          ...proof,
          status:
            receipt.status === "success" ? "mined_requires_audit" : "reverted",
          blockNumber: receipt.blockNumber,
        }),
      );
      // A success whose exact execution proof was interrupted needs explicit review.
      if (receipt.status === "success")
        throw new Error(
          "A mined payment requires proof review before another run.",
        );
    }
    const payroll = await createPayrollTools(env);
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
          await writeFile(
            completedPath,
            json({ hash: result.transactionHash, taskId }),
          );
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
    await lock.close();
    await unlink(lockPath);
  }
}
