import { test } from "node:test";
import assert from "node:assert/strict";
import { keccak256, stringToHex } from "viem";
import { parseJob } from "../agent/job.js";
import { parseConfig } from "../cre/workflows/milestone/config.js";
const job = {
  version: 1,
  account: "0x1111111111111111111111111111111111111111",
  agent: "0x2222222222222222222222222222222222222222",
  asset: "0x3333333333333333333333333333333333333333",
  recipient: "0x4444444444444444444444444444444444444444",
  repo: "owner/repo",
  pr: 2,
  condition: keccak256(stringToHex("github:owner/repo:2")),
  amount: "30",
  generation: "3",
  policyHash: `0x${"1".repeat(64)}`,
  savedAt: new Date().toISOString(),
};
test("stored jobs bind a real account, signer, amount and exact GitHub condition", () => {
  assert.equal(parseJob(job).amount, "30");
  assert.throws(() => parseJob({ ...job, pr: 3 }));
  assert.throws(() =>
    parseJob({
      ...job,
      recipient: "0x0000000000000000000000000000000000000000",
    }),
  );
  assert.throws(() => parseJob({ ...job, amount: "0" }));
});
test("CRE can follow a fixed public HTTPS task feed without a hardcoded PR", () => {
  const config = {
    schedule: "0 */1 * * * *",
    receiver: job.account,
    productionWriteConfirmed: true,
    tasksUrl: "https://example.com/api/task",
  };
  assert.equal(parseConfig(config).tasksUrl, config.tasksUrl);
  assert.throws(() =>
    parseConfig({ ...config, tasksUrl: "http://example.com/api/task" }),
  );
  assert.throws(() =>
    parseConfig({ ...config, tasksUrl: "https://secret@example.com/api/task" }),
  );
  assert.throws(() =>
    parseConfig({ ...config, productionWriteConfirmed: false }),
  );
});
