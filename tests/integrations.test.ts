import assert from "node:assert/strict";
import test from "node:test";
import {
  parseConfig,
  parseEvidence,
} from "../cre/workflows/milestone/config.js";
import { identityCommitment } from "../packages/shared/identity.js";
import { payrollTaskId } from "../agent/task.js";
import { loadRuntimeEnv } from "../agent/config.js";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
const receiver = "0x1111111111111111111111111111111111111111";
test("saved identity cannot silently follow a replacement agent wallet", async () => {
  const root = await mkdtemp(join(tmpdir(), "confiance-config-"));
  try {
    await mkdir(join(root, "deployments"));
    await writeFile(
      join(root, "deployments/identity.json"),
      JSON.stringify({
        id: "0",
        registry: receiver,
        agent: receiver,
        chainId: 10143,
        commitment: identityCommitment(receiver, 0n),
      }),
    );
    const env = {
      CONFIANCE_PROJECT_ROOT: root,
      ERC8004_IDENTITY_REGISTRY: receiver,
      AGENT_ADDRESS: receiver,
    };
    assert.equal((await loadRuntimeEnv(env)).ERC8004_AGENT_ID, "0");
    await assert.rejects(
      loadRuntimeEnv({
        ...env,
        AGENT_ADDRESS: "0x2222222222222222222222222222222222222222",
      }),
      /does not match/,
    );
    await assert.rejects(
      loadRuntimeEnv({
        ...env,
        ERC8004_IDENTITY_REGISTRY: "0x2222222222222222222222222222222222222222",
      }),
      /does not match/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("CRE configuration cannot silently enable an unconfirmed reporting path", () => {
  assert.throws(() =>
    parseConfig({
      schedule: "0 * * * * *",
      repo: "acme/payroll",
      pr: 42,
      receiver,
      productionWriteConfirmed: false,
    }),
  );
  assert.equal(
    parseConfig({
      schedule: "0 * * * * *",
      repo: "acme/payroll",
      pr: 42,
      receiver,
      productionWriteConfirmed: true,
    }).pr,
    42,
  );
  assert.throws(() =>
    parseConfig({
      schedule: "0 * * * * *",
      repo: "../payroll",
      pr: 42,
      receiver,
      productionWriteConfirmed: true,
    }),
  );
});
test("CRE requires actual merge evidence for the exact repository and PR", () => {
  const data = {
    number: 42,
    state: "open",
    merged: false,
    base: { repo: { full_name: "acme/payroll" } },
  };
  assert.equal(parseEvidence(data, "acme/payroll", 42).merged, false);
  assert.throws(() =>
    parseEvidence({ ...data, merged: true }, "acme/payroll", 42),
  );
  assert.throws(() => parseEvidence(data, "other/payroll", 42));
  assert.throws(() => parseEvidence(data, "acme/payroll", 43));
  const merged = {
    ...data,
    state: "closed",
    merged: true,
    merged_at: "2026-10-08T10:00:00Z",
    merge_commit_sha: "a".repeat(40),
  };
  assert.equal(parseEvidence(merged, "acme/payroll", 42).merged, true);
  assert.throws(() =>
    parseEvidence(
      { ...merged, merge_commit_sha: "invented" },
      "acme/payroll",
      42,
    ),
  );
});
test("identity commitment binds registry and minted token ID including token zero", () => {
  const first = identityCommitment(receiver, 0n);
  assert.notEqual(first, identityCommitment(receiver, 1n));
  assert.notEqual(
    first,
    identityCommitment("0x2222222222222222222222222222222222222222", 0n),
  );
});
test("payroll completion key survives signer rotation and amount formatting changes", () => {
  const env = {
    CONFIANCE_ADDRESS: receiver,
    PAYMENT_ASSET: "0x2222222222222222222222222222222222222222",
    PAYMENT_RECIPIENT: "0x3333333333333333333333333333333333333333",
    GITHUB_REPO: "acme/payroll",
    GITHUB_PR_NUMBER: "42",
    PAYMENT_AMOUNT: "30",
    PRIVY_AGENT_WALLET_ID: "first",
  };
  assert.equal(
    payrollTaskId(env),
    payrollTaskId({
      ...env,
      PAYMENT_AMOUNT: "30.00",
      PRIVY_AGENT_WALLET_ID: "replacement",
    }),
  );
  assert.notEqual(
    payrollTaskId(env),
    payrollTaskId({ ...env, GITHUB_PR_NUMBER: "43" }),
  );
});
