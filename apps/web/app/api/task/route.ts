import {
  decodeFunctionData,
  erc20Abi,
  getAddress,
  isHex,
  keccak256,
  stringToHex,
} from "viem";
import { relayBackend } from "../../../lib/backend";
import { requireOwner } from "../../../lib/auth";
import { checkedClient, publicResponse } from "../../../lib/server";
import { runtimeEnv } from "../../../lib/settings";
import { confianceAbi } from "../../../../../packages/shared/contracts";
import { address } from "../../../../../packages/shared/config";
import { dataPath, writeRecord } from "../../../../../packages/shared/storage";
import { parseJob, readJob, readMonitoring } from "../../../../../agent/job";
import { parseExactAmount } from "../../../../../agent/tools/amount";
import { acquirePayrollLease } from "../../../../../packages/shared/lease";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const relay = await relayBackend(request);
  if (relay) return relay;
  try {
    const env = await runtimeEnv();
    const job = await readJob(env);
    if (!job) return publicResponse({ tasks: [] });
    // Public discovery provides metadata only. CRE independently checks policy and GitHub.
    return publicResponse({
      tasks: [
        {
          receiver: job.account,
          agent: job.agent,
          repo: job.repo,
          pr: job.pr,
          condition: job.condition,
        },
      ],
    });
  } catch {
    return publicResponse({ error: "Task discovery unavailable." }, 503);
  }
}
export async function POST(request: Request) {
  const relay = await relayBackend(request);
  if (relay) return relay;
  let lease: Awaited<ReturnType<typeof acquirePayrollLease>> | undefined;
  try {
    const owner = await requireOwner(request);
    const env = await runtimeEnv();
    lease = await acquirePayrollLease(env);
    const value: unknown = await request.json();
    if (!value || typeof value !== "object") throw new Error("Invalid task.");
    const v = value as Record<string, unknown>;
    const account = address(env, "CONFIANCE_ADDRESS"),
      agent = address(env, "AGENT_ADDRESS");
    const client = await checkedClient();
    if (v.action === "monitor") {
      if (typeof v.enabled !== "boolean")
        throw new Error("Invalid monitoring state.");
      const job = await readJob(env);
      if (!job) throw new Error("Save a payroll task first.");
      if (v.enabled) {
        const session = await client.readContract({
          address: account,
          abi: confianceAbi,
          functionName: "getSession",
          args: [agent],
        });
        const block = await client.getBlock();
        if (
          !session.active ||
          session.policy.expiry <= block.timestamp ||
          session.policy.requiredCondition !== job.condition
        )
          throw new Error("Authorize the task first.");
      }
      await writeRecord(dataPath(env, "monitoring.json"), {
        enabled: v.enabled,
        updatedAt: new Date().toISOString(),
      });
      return publicResponse(await readMonitoring(env));
    }
    if (
      v.action !== "save" ||
      typeof v.repo !== "string" ||
      typeof v.pr !== "number" ||
      typeof v.policyHash !== "string" ||
      !isHex(v.policyHash)
    )
      throw new Error("Invalid task.");
    const [receipt, tx, session] = await Promise.all([
      client.getTransactionReceipt({ hash: v.policyHash }),
      client.getTransaction({ hash: v.policyHash }),
      client.readContract({
        address: account,
        abi: confianceAbi,
        functionName: "getSession",
        args: [agent],
      }),
    ]);
    const call = decodeFunctionData({ abi: confianceAbi, data: tx.input });
    if (
      receipt.status !== "success" ||
      tx.from.toLowerCase() !== owner.toLowerCase() ||
      tx.to?.toLowerCase() !== account.toLowerCase() ||
      (call.functionName !== "createSession" &&
        call.functionName !== "updatePolicy") ||
      getAddress(call.args[0]) !== agent
    )
      throw new Error("Owner policy receipt required.");
    const job = parseJob({
      ...v,
      version: 1,
      account,
      agent,
      condition: keccak256(stringToHex(`github:${v.repo}:${v.pr}`)),
      generation: String(session.generation),
      savedAt: new Date().toISOString(),
    });
    const approved = call.args[1];
    if (
      approved.requiredCondition !== job.condition ||
      approved.allowedAsset.toLowerCase() !== job.asset.toLowerCase() ||
      approved.allowedRecipient.toLowerCase() !== job.recipient.toLowerCase() ||
      session.policy.requiredCondition !== job.condition ||
      session.policy.allowedAsset.toLowerCase() !== job.asset.toLowerCase() ||
      session.policy.allowedRecipient.toLowerCase() !==
        job.recipient.toLowerCase()
    )
      throw new Error("Task differs from owner policy.");
    const decimals = await client.readContract({
      address: job.asset,
      abi: erc20Abi,
      functionName: "decimals",
    });
    if (parseExactAmount(job.amount, decimals) > session.policy.spendingLimit)
      throw new Error("Payment exceeds policy.");
    await writeRecord(dataPath(env, "monitoring.json"), {
      enabled: false,
      updatedAt: new Date().toISOString(),
    });
    await writeRecord(dataPath(env, "payroll-task.json"), job);
    return publicResponse({ status: "saved", job });
  } catch {
    return publicResponse(
      {
        error:
          "Task was not saved. Confirm owner sign-in, policy receipt and matching token, recipient and milestone. Wait for any active worker cycle to finish.",
      },
      409,
    );
  } finally {
    await lease?.release();
  }
}
