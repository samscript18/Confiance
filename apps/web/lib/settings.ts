import "server-only";
import { loadRuntimeEnv } from "../../../agent/config";
export async function runtimeEnv() {
  return loadRuntimeEnv(process.env);
}
