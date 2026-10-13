import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentProof, runCheck } from "../apps/web/lib/agent-run.js";

test("agent run never promotes model prose, arbitrary tool hashes or missing receipts into payment confirmation", () => {
  const content = JSON.stringify({
    status: "executed",
    transactionHash: `0x${"1".repeat(64)}`,
  });
  assert.equal(paymentProof([{ kind: "reasoning", content }]), undefined);
  assert.equal(
    paymentProof([{ kind: "tool", name: "check_balance", content }]),
    undefined,
  );
  assert.equal(
    paymentProof([
      {
        kind: "tool",
        name: "request_payment",
        content: '{"status":"executed"}',
      },
    ]),
    undefined,
  );
  assert.equal(
    paymentProof([
      {
        kind: "tool",
        name: "request_payment",
        content: JSON.stringify({
          status: "submitted_unverified",
          transactionHash: `0x${"1".repeat(64)}`,
        }),
      },
    ])?.confirmed,
    false,
  );
});
test("direct GitHub unavailability stays distinct from onchain milestone verification", () => {
  assert.equal(
    runCheck({
      kind: "tool",
      name: "check_github_milestone",
      content: '{"status":"unavailable"}',
    }).tone,
    "warning",
  );
  assert.equal(
    runCheck({
      kind: "tool",
      name: "check_payment_policy",
      content: '{"conditionVerified":true,"spendingLimit":"20"}',
    }).tone,
    "success",
  );
  assert.equal(
    runCheck({
      kind: "tool",
      name: "check_payment_policy",
      content:
        '{"conditionVerified":true,"expectedCondition":"one","requiredCondition":"two"}',
    }).tone,
    "warning",
  );
  assert.equal(
    runCheck({
      kind: "tool",
      name: "check_agent_session",
      content: "malformed",
    }).tone,
    "neutral",
  );
});
