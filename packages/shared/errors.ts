import { BaseError, ContractFunctionRevertedError } from "viem";

export const messages: Readonly<Record<string, string>> = {
  SESSION_REVOKED: "This agent no longer has permission to act.",
  SESSION_SPENDING_LIMIT:
    "The request exceeds the remaining total session spending limit.",
  SESSION_EXPIRED: "This agent’s authorization has expired.",
  CONDITION_NOT_VERIFIED:
    "The required external condition has not been verified onchain.",
  RECIPIENT_NOT_ELIGIBLE:
    "The recipient does not satisfy the onchain recipient rule.",
  ASSET_NOT_ALLOWED: "This asset is not permitted by the agent’s policy.",
  INVALID_NONCE: "This request is stale or has already been used.",
  INVALID_GENERATION:
    "The policy changed. Read the current session before retrying.",
  AGENT_NOT_REGISTERED: "This signer is not a registered agent.",
  SESSION_NOT_CREATED: "The owner has not created this agent’s session.",
  SESSION_ALREADY_ACTIVE:
    "This agent already has an active session. Revoke it before creating a session for a different token, or update its existing policy using the same token.",
  INVALID_POLICY:
    "This policy is invalid. An existing session cannot change tokens or reduce its budget below the amount already spent. Revoke and create a new session to change tokens.",
  OWNER_ONLY: "Only the Confiance owner can approve this action.",
  AGENT_ALREADY_REGISTERED: "This agent is already registered with Confiance.",
};
export function contractError(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof BaseError) {
    const cause = error.walk(
      (item) => item instanceof ContractFunctionRevertedError,
    );
    if (
      cause instanceof ContractFunctionRevertedError &&
      cause.data?.errorName
    ) {
      const code = cause.data.errorName;
      return {
        code,
        message: messages[code] ?? "The contract rejected this request.",
      };
    }
  }
  // Never send raw provider responses to the LLM/UI: they can contain configuration.
  return {
    code: "EXECUTION_UNAVAILABLE",
    message:
      "Execution could not be verified. Check configuration, network, and wallet funding.",
  };
}
