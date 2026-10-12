import assert from "node:assert/strict";
import { test } from "node:test";
import { assertMonad, address, rpcUrl } from "../packages/shared/config.js";
import { parseExactAmount } from "../agent/tools/payroll.js";
import { parseMilestone } from "../agent/tools/github.js";
import { parseAssistant, validateToolCall } from "../agent/runtime/llm.js";

test("chain guard rejects mainnet and arbitrary chains", () => {
  assert.doesNotThrow(() => assertMonad(10143));
  for (const chainId of [143, 1, 31337, 0, NaN])
    assert.throws(() => assertMonad(chainId));
});
test("amount parsing uses token precision exactly without rounding", () => {
  assert.equal(parseExactAmount("30", 6), 30000000n);
  assert.equal(parseExactAmount("0.000001", 6), 1n);
  assert.equal(parseExactAmount("50", 18), 50000000000000000000n);
  for (const input of [
    "0",
    "-30",
    "0.0000001",
    "NaN",
    "1e6",
    "30 USD",
    "Infinity",
  ])
    assert.throws(() => parseExactAmount(input, 6));
});
test("tools cannot accept privileged calldata or payment overrides", () => {
  assert.equal(validateToolCall("request_payment", "{}"), "request_payment");
  for (const name of [
    "configureReporter",
    "transferOwnership",
    "createSession",
    "sendTransaction",
  ])
    assert.throws(() => validateToolCall(name, "{}"));
  for (const args of [
    '{"amount":"500"}',
    '{"recipient":"0x123"}',
    '{"calldata":"0x00"}',
    "[]",
    "null",
  ])
    assert.throws(() => validateToolCall("request_payment", args));
});
test("GitHub closed but unmerged remains unverified", () => {
  assert.equal(
    parseMilestone(
      { number: 42, merged: false, state: "closed", merged_at: null },
      42,
    ).merged,
    false,
  );
  assert.equal(
    parseMilestone({ number: 42, merged: false, state: "open" }, 42).merged,
    false,
  );
});
test("GitHub merged requires matching PR and merge evidence", () => {
  assert.throws(() =>
    parseMilestone({ number: 43, merged: true, state: "closed" }, 42),
  );
  assert.throws(() =>
    parseMilestone({ number: 42, merged: true, state: "closed" }, 42),
  );
  assert.equal(
    parseMilestone(
      {
        number: 42,
        merged: true,
        state: "closed",
        merged_at: "2026-10-08T10:00:00Z",
        merge_commit_sha: "abc",
      },
      42,
    ).merged,
    true,
  );
});
test("LLM malformed tool calls fail closed", () => {
  assert.throws(() => parseAssistant({ choices: [] }));
  assert.throws(() =>
    parseAssistant({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                type: "function",
                id: "x",
                function: { name: "request_payment", arguments: {} },
              },
            ],
          },
        },
      ],
    }),
  );
  const result = parseAssistant({
    choices: [
      {
        message: {
          content: null,
          tool_calls: [
            {
              type: "function",
              id: "x",
              function: { name: "request_payment", arguments: "{}" },
            },
          ],
        },
      },
    ],
  });
  assert.equal(result.tool_calls?.[0]?.function.name, "request_payment");
});
test("RPC refuses nonlocal insecure HTTP", () => {
  assert.throws(() => rpcUrl({ MONAD_RPC_URL: "http://example.com" }));
  assert.equal(
    rpcUrl({ MONAD_RPC_URL: "https://example.com" }),
    "https://example.com/",
  );
});
test("configuration rejects empty and zero contract addresses", () => {
  assert.throws(() => address({}, "CONFIANCE_ADDRESS"));
  assert.throws(() =>
    address(
      { CONFIANCE_ADDRESS: "0x0000000000000000000000000000000000000000" },
      "CONFIANCE_ADDRESS",
    ),
  );
});
