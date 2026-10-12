import { registerIdentity } from "../agent/identity.js";
import { json } from "../packages/shared/config.js";
import { loadRuntimeEnv } from "../agent/config.js";
try {
  console.log(json(await registerIdentity(await loadRuntimeEnv(process.env))));
} catch {
  console.error(
    "Identity registration unavailable. Check registry version, URI, Privy configuration and agent gas funding.",
  );
  process.exitCode = 1;
}
