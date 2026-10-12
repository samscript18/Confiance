import assert from "node:assert/strict";
import test from "node:test";
import {
  actionCopy,
  blockedPayment,
  payrollFeedback,
} from "../apps/web/lib/feedback.js";
const hash = `0x${"ab".repeat(32)}`;
const tool = (name: string, value: unknown) => ({
  kind: "tool",
  name,
  content: JSON.stringify(value),
});
test("payment success messages require a payment tool result, never model prose", () => {
  assert.notEqual(
    payrollFeedback([
      { kind: "assistant", content: "Payment executed successfully." },
    ]).tone,
    "success",
  );
  assert.notEqual(
    payrollFeedback([
      tool("check_balance", { status: "executed", transactionHash: hash }),
    ]).tone,
    "success",
  );
  assert.notEqual(
    payrollFeedback([
      tool("request_payment", {
        status: "executed",
        transactionHash: "invented",
      }),
    ]).tone,
    "success",
  );
  const paid = payrollFeedback([
    tool("request_payment", { status: "executed", transactionHash: hash }),
  ]);
  assert.equal(paid.title, "Contractor paid");
  assert.equal(paid.transactionHash, hash);
});
test("pending and previously completed payments have distinct, accurate outcomes", () => {
  const pending = payrollFeedback([
    tool("request_payment", {
      status: "submitted_unverified",
      transactionHash: hash,
    }),
  ]);
  assert.equal(pending.title, "Payment is awaiting confirmation");
  assert.equal(pending.tone, "info");
  const already = payrollFeedback([
    tool("task_receipt", { status: "already_paid", transactionHash: hash }),
  ]);
  assert.equal(already.title, "This contractor was already paid");
  assert.match(already.message, /did not send another payment/);
});
test("blocking reasons explain the rule without exposing internal codes", () => {
  for (const code of [
    "CONDITION_NOT_VERIFIED",
    "SESSION_REVOKED",
    "SESSION_SPENDING_LIMIT",
    "ASSET_NOT_ALLOWED",
  ]) {
    const result = blockedPayment(code, hash);
    assert.equal(result.title, "Payment blocked");
    assert.equal(result.tone, "blocked");
    assert.equal(result.message.includes(code), false);
  }
  assert.match(blockedPayment("CONDITION_NOT_VERIFIED").message, /milestone/);
  assert.match(blockedPayment("SESSION_REVOKED").message, /removed/);
});
test("agent checks distinguish missing authority and an unverified milestone", () => {
  const waiting = payrollFeedback([
    tool("check_payment_policy", { conditionVerified: false }),
  ]);
  assert.equal(waiting.title, "Waiting for the milestone");
  const missing = payrollFeedback([
    tool("check_agent_session", { active: false }),
    tool("check_payment_policy", { conditionVerified: false }),
  ]);
  assert.equal(missing.title, "The agent needs permission");
});
test("each pending action communicates what is happening", () => {
  assert.equal(
    actionCopy("Authorizing session").pending,
    "Authorizing Payroll Agent…",
  );
  assert.equal(actionCopy("Revoking session").pending, "Revoking permission…");
  assert.notEqual(
    actionCopy("Authorizing session").errorTitle,
    actionCopy("Funding treasury").errorTitle,
  );
});
test("task verification and session milestone mismatch produce a correction message", () => {
  const result = payrollFeedback([
    tool("check_payment_policy", {
      requiredCondition: "a",
      expectedCondition: "b",
      conditionVerified: false,
    }),
  ]);
  assert.equal(result.title, "The payment rules need updating");
  assert.equal(result.tone, "info");
});
