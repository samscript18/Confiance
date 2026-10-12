import { keccak256, stringToHex } from "viem";
import { address, required } from "../packages/shared/config.js";
/** One contractor/asset/milestone task across wallet rotations and amount edits. */
export function payrollTaskId(env: NodeJS.ProcessEnv) {
  const pr = Number(required(env, "GITHUB_PR_NUMBER"));
  if (!Number.isSafeInteger(pr) || pr <= 0) throw new Error("Invalid task PR.");
  return keccak256(
    stringToHex(
      [
        10143,
        address(env, "CONFIANCE_ADDRESS").toLowerCase(),
        address(env, "PAYMENT_ASSET").toLowerCase(),
        address(env, "PAYMENT_RECIPIENT").toLowerCase(),
        required(env, "GITHUB_REPO").toLowerCase(),
        pr,
      ].join(":"),
    ),
  );
}
