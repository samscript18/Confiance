import { runConfiguredPayroll } from "./service.js";
import { json } from "../../packages/shared/config.js";
import { loadRuntimeEnv } from "../config.js";
const interval = Number(process.env.AGENT_POLL_SECONDS || 120);
if (!Number.isSafeInteger(interval) || interval < 60)
  throw new Error("Polling interval must be at least 60 seconds.");
const abort = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => abort.abort());
while (!abort.signal.aborted) {
  try {
    const result = await runConfiguredPayroll(
      await loadRuntimeEnv(process.env),
    );
    console.log(json(result));
    if ("status" in result && result.status === "already_paid") break;
  } catch {
    console.error(
      "Payroll cycle unavailable. No payment success is claimed. Check configuration or pending-proof reconciliation.",
    );
  }
  try {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, interval * 1000);
      abort.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  } catch {
    break;
  }
}
