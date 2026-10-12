import assert from "node:assert/strict";
import test from "node:test";
import { sessionActions } from "../apps/web/lib/action-state.js";
import type { DashboardState } from "../apps/web/lib/state.js";

const token = "0x1111111111111111111111111111111111111111";
const agent = "0x2222222222222222222222222222222222222222";
function ready(): DashboardState {
  return {
    network: "Monad Testnet",
    chainId: 10143,
    configured: true,
    agent,
    asset: token,
    taskAsset: token,
    agentWalletConnected: true,
    identity: {
      id: "1",
      owner: agent,
      wallet: agent,
      uri: "https://example.com/agent.json",
    },
    events: [],
    historySource: "unavailable",
    taskAmount: "30",
    readiness: [{ name: "AI runtime", ready: true, detail: "Configured" }],
    session: {
      exists: true,
      active: true,
      expired: false,
      generation: "1",
      spent: "0",
      limit: "50",
      remaining: "50",
      expiry: "2000000000",
      condition: `0x${"ab".repeat(32)}`,
      verified: false,
      adapter: "0x0000000000000000000000000000000000000000",
    },
  };
}
test("an authorized session cannot be created twice and can be edited with the same asset", () => {
  const actions = sessionActions(ready(), true, true, token);
  assert.equal(actions.create.enabled, false);
  assert.equal(actions.create.label, "Session authorized");
  assert.equal(actions.update.enabled, true);
  assert.equal(actions.run.enabled, true);
  assert.equal(actions.revoked.enabled, false);
  const unchanged = sessionActions(ready(), true, true, token, false);
  assert.equal(unchanged.update.enabled, false);
  assert.equal(unchanged.update.label, "Policy unchanged");
});
test("changing tokens blocks policy edits and runtime requests without silently changing authority", () => {
  const state = ready();
  state.taskAsset = agent;
  const actions = sessionActions(state, true, true, agent);
  assert.equal(actions.update.enabled, false);
  assert.equal(actions.run.enabled, false);
  assert.equal(actions.limit.enabled, false);
  assert.match(actions.update.reason, /revoking/);
});
test("revocation enables renewal and only the revoked-key diagnostic", () => {
  const state = ready();
  state.session = { ...state.session!, active: false };
  const actions = sessionActions(state, true, true, token);
  assert.equal(actions.create.enabled, true);
  assert.equal(actions.create.label, "Authorize new session");
  assert.equal(actions.revoke.enabled, false);
  assert.equal(actions.revoked.enabled, true);
  for (const action of [
    actions.update,
    actions.run,
    actions.limit,
    actions.condition,
    actions.recipient,
  ])
    assert.equal(action.enabled, false);
});
test("expired or signed-out owners cannot use actions presented as ready", () => {
  const state = ready();
  state.session = { ...state.session!, expired: true };
  const expired = sessionActions(state, true, true, token);
  assert.equal(expired.create.enabled, true);
  assert.equal(expired.run.enabled, false);
  assert.equal(expired.update.enabled, false);
  for (const action of Object.values(sessionActions(state, false, true, token)))
    assert.equal(action.enabled, false);
});
test("diagnostics stop advertising tests whose required state is absent", () => {
  const state = ready();
  state.session = { ...state.session!, verified: true };
  const actions = sessionActions(state, true, true, token);
  assert.equal(actions.condition.enabled, false);
  assert.match(actions.condition.reason, /already verified/);
  assert.equal(actions.recipient.enabled, false);
  assert.match(actions.recipient.reason, /DIAGNOSTIC_RECIPIENT/);
  state.error = "RPC unavailable";
  for (const action of Object.values(sessionActions(state, true, true, token)))
    assert.equal(action.enabled, false);
});
