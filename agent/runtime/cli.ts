import { json } from "../../packages/shared/config.js";
import { runConfiguredPayroll } from "./service.js";
import { loadRuntimeEnv } from "../config.js";

try {
  const result = await runConfiguredPayroll(await loadRuntimeEnv(process.env));
  console.log(
    json({
      ...result,
      note: "Model prose is reasoning. Only a request_payment executed result with a verified receipt proves settlement.",
    }),
  );
} catch {
  console.error(
    "Payroll runtime unavailable. Check the ignored .env and preflight report. No successful payment is claimed.",
  );
  process.exitCode = 1;
}
