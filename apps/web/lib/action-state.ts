import { zeroHash } from "viem";
import type { DashboardState } from "./state.js";

export interface ActionState {
  label: string;
  reason: string;
  enabled: boolean;
}
function action(
  label: string,
  ...blockers: (string | false | undefined)[]
): ActionState {
  const reason = blockers.find((item) => Boolean(item)) || "";
  return { label, reason, enabled: !reason };
}

// Presentation only. The contract and deterministic tools still validate every request.
export function sessionActions(
  state: DashboardState,
  signedIn: boolean,
  policyReady: boolean,
  selectedAsset: string,
  policyChanged = true,
) {
  const session = state.session;
  const live = Boolean(session?.active && !session.expired);
  const owner =
    !signedIn && "Sign in with your owner passkey to use this action.";
  const chain =
    (!state.configured || Boolean(state.error)) &&
    "Wait for a verified Confiance account and current chain state.";
  const wallet =
    !state.agentWalletConnected &&
    "Connect the separate Privy agent wallet first.";
  const mismatch =
    Boolean(
      state.taskAsset &&
        state.asset &&
        state.taskAsset.toLowerCase() !== state.asset.toLowerCase(),
    ) &&
    "The configured payment token differs from the session token. Revoke and authorize a session for the funded token, or correct payment configuration.";
  const diagnostic = [
    owner,
    chain,
    wallet,
    !session && "Authorize an agent session first.",
    mismatch,
  ];
  const active = !live && "This test requires an active, unexpired session.";
  return {
    create: action(
      live
        ? "Session authorized"
        : session
          ? "Authorize new session"
          : "Authorize session",
      live &&
        "A session is already active. Revoke it before granting a new token or budget.",
      owner,
      chain,
      wallet,
      (!state.identity ||
        !state.agent ||
        state.identity.wallet.toLowerCase() !== state.agent.toLowerCase() ||
        state.identity.owner.toLowerCase() !== state.agent.toLowerCase()) &&
        "Register an identity owned by the connected agent wallet first.",
      !policyReady &&
        "Complete the token, recipient, budget and GitHub milestone fields.",
    ),
    update: action(
      policyChanged ? "Save policy changes" : "Policy unchanged",
      owner,
      chain,
      !live && "Authorize an active session before editing its policy.",
      selectedAsset.toLowerCase() !== state.asset?.toLowerCase() &&
        "Changing tokens requires revoking this session and authorizing a new one.",
      !policyReady && "Complete all policy fields.",
      !policyChanged &&
        "Edit the budget, recipient or milestone before saving. Saving also renews the session expiry to 24 hours from now.",
    ),
    run: action(
      "Run Payroll Agent",
      owner,
      chain,
      wallet,
      !live && "Authorize an active, unexpired session first.",
      mismatch,
      !state.readiness.find((item) => item.name === "AI runtime")?.ready &&
        "Configure the LLM provider before running the agent.",
    ),
    revoke: action(
      session && !session.active ? "Session revoked" : "Revoke agent session",
      owner,
      chain,
      !session?.active && "There is no active session to revoke.",
    ),
    limit: action(
      "Attempt 500 tokens",
      ...diagnostic,
      active,
      Number(session?.limit ?? 0) >= 500 &&
        "This diagnostic requires a total session budget below 500 tokens.",
    ),
    condition: action(
      "Attempt before verification",
      ...diagnostic,
      active,
      session?.verified &&
        "The milestone is already verified; this test is no longer applicable.",
      session?.condition === zeroHash &&
        "This session has no required milestone.",
      Number(session?.remaining ?? 0) < 30 &&
        "This test needs at least 30 tokens of remaining authority.",
    ),
    recipient: action(
      "Attempt wrong recipient",
      ...diagnostic,
      active,
      !state.diagnosticRecipientConfigured &&
        "Configure a different DIAGNOSTIC_RECIPIENT to test the recipient restriction.",
    ),
    revoked: action(
      "Retry after revocation",
      ...diagnostic,
      session?.active && "Revoke the agent session before running this test.",
    ),
  };
}
