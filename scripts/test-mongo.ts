import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  database,
  dataPath,
  insertRecord,
  readRecord,
  recordNames,
  removeRecord,
  writeRecord,
} from "../packages/shared/storage.js";
import { acquirePayrollLease } from "../packages/shared/lease.js";
if (!process.env.MONGODB_URI) throw new Error("MongoDB URI required.");
process.env.CONFIANCE_STORAGE_NAMESPACE = `validation-${randomUUID()}`;
const env = process.env;
const path = dataPath(env, "validation.json");
let lease: Awaited<ReturnType<typeof acquirePayrollLease>> | undefined;
try {
  await (await database()).command({ ping: 1 });
  await writeRecord(path, { amount: 30000000n, status: "verified_fixture" });
  assert.deepEqual(await readRecord(path), {
    amount: "30000000",
    status: "verified_fixture",
  });
  const exclusive = dataPath(env, "intent-test.json");
  const results = await Promise.all(
    Array.from({ length: 8 }, () => insertRecord(exclusive, { intent: true })),
  );
  assert.equal(results.filter(Boolean).length, 1);
  assert.ok(
    (
      await recordNames(
        join(env.CONFIANCE_PROJECT_ROOT || process.cwd(), "deployments"),
      )
    ).includes("validation.json"),
  );
  lease = await acquirePayrollLease(env);
  await lease.assertHeld();
  await assert.rejects(acquirePayrollLease(env));
  await lease.release();
  lease = undefined;
  lease = await acquirePayrollLease(env);
  await lease.assertHeld();
  await removeRecord(path);
  await removeRecord(exclusive);
  assert.equal(await readRecord(path), undefined);
  console.log(
    "MongoDB integration PASS: authenticated connection, durable CRUD, eight-way unique-intent exclusion, shared execution lease, release/reacquisition and isolated cleanup.",
  );
} catch {
  console.error("MongoDB integration failed; no payment was attempted.");
  process.exitCode = 1;
} finally {
  await lease?.release();
  process.exit(process.exitCode || 0);
}
