import { loadRuntimeEnv } from "../config.js";
import { readJob, readMonitoring } from "../job.js";
import { runConfiguredPayroll } from "./service.js";
import {
  dataPath,
  writeRecord,
  closeStorage,
} from "../../packages/shared/storage.js";
import { createPublicClient, http } from "viem";
import { confianceAbi } from "../../packages/shared/contracts.js";
import {
  rpcUrl,
  targetChain,
  assertMonad,
} from "../../packages/shared/config.js";
const controller = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => controller.abort());
const interval = Number(process.env.AGENT_POLL_SECONDS || 120);
if (!Number.isSafeInteger(interval) || interval < 60)
  throw new Error("Invalid worker interval.");
while (!controller.signal.aborted) {
  try {
    const env = await loadRuntimeEnv(process.env);
    const job = await readJob(env),
      monitor = await readMonitoring(env);
    const statusPath = dataPath(env, "worker-status.json");
    if (!job || !monitor.enabled) {
      await writeRecord(statusPath, {
        status: "idle",
        heartbeat: new Date().toISOString(),
      });
    } else {
      const client = createPublicClient({
        chain: targetChain,
        transport: http(rpcUrl(env)),
      });
      assertMonad(await client.getChainId());
      const session = await client.readContract({
        address: job.account,
        abi: confianceAbi,
        functionName: "getSession",
        args: [job.agent],
      });
      const block = await client.getBlock();
      if (
        !session.active ||
        session.policy.expiry <= block.timestamp ||
        session.policy.requiredCondition !== job.condition
      ) {
        await writeRecord(statusPath, {
          status: "permission_required",
          heartbeat: new Date().toISOString(),
          condition: job.condition,
        });
      } else {
        await writeRecord(statusPath, {
          status: "checking",
          heartbeat: new Date().toISOString(),
          condition: job.condition,
        });
        const result = await runConfiguredPayroll(env);
        await writeRecord(statusPath, {
          status: "observing",
          heartbeat: new Date().toISOString(),
          condition: job.condition,
          result,
        });
        if (
          "status" in result &&
          result.status === "already_paid" &&
          (await readJob(env))?.condition === job.condition
        )
          await writeRecord(dataPath(env, "monitoring.json"), {
            enabled: false,
            updatedAt: new Date().toISOString(),
          });
      }
    }
  } catch {
    console.error(
      "Worker cycle unconfirmed. No successful payment is claimed.",
    );
  }
  await new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, interval * 1000);
    controller.signal.addEventListener("abort", finish, { once: true });
    if (controller.signal.aborted) finish();
  });
}

await closeStorage();
