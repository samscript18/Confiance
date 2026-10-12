import { isHex } from "viem";
import { recordIdentity } from "../agent/identity.js";
import { loadRuntimeEnv } from "../agent/config.js";
import { json } from "../packages/shared/config.js";
const hash = process.argv[2];
if (!hash || !isHex(hash) || hash.length !== 66)
  throw new Error("Usage: record-identity.ts <actual mint hash>");
try {
  console.log(
    json(await recordIdentity(await loadRuntimeEnv(process.env), hash)),
  );
} catch {
  console.error(
    "Identity receipt does not match the configured registry, signer, metadata or current ownership.",
  );
  process.exitCode = 1;
}
