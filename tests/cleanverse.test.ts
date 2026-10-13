import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecipheriv } from "node:crypto";
import {
  cleanverseOwnerMessage,
  encryptCleanverse,
  parseCleanverseRule,
  cleanverseRequest,
  cleanverseRejectionReason,
  CleanverseRequestError,
} from "../packages/shared/cleanverse.js";
import { cleanverseFailure } from "../apps/web/lib/cleanverse-feedback.js";

test("Cleanverse non-JSON 403 preserves safe diagnostics without leaking response content", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("<html>provider secret fixture</html>", {
      status: 403,
      headers: { "Content-Type": "text/html" },
    });
  try {
    await assert.rejects(
      cleanverseRequest(
        "register",
        { contract_address: account },
        { CLEANVERSE_APP_ID: "fixture-app", CLEANVERSE_API_KEY: key },
      ),
      (error) => {
        assert.ok(error instanceof CleanverseRequestError);
        assert.equal(error.httpStatus, 403);
        assert.equal(error.reason, "PROVIDER_HTTP_FORBIDDEN");
        assert.equal(error.endpoint, "register");
        assert.ok(error.requestId);
        assert.ok(!JSON.stringify(error).includes("provider secret fixture"));
        assert.equal(
          cleanverseFailure(error.reason).title,
          "Cleanverse blocked this request",
        );
        return true;
      },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("Cleanverse failure feedback distinguishes provider rejection from owner sign-in and never echoes raw messages", () => {
  assert.equal(
    cleanverseRejectionReason("0001", "Invalid contract owner signature."),
    "SIGNATURE_REJECTED",
  );
  assert.equal(
    cleanverseRejectionReason("0003", "invalid access"),
    "CREDENTIALS_OR_ALLOWLIST",
  );
  assert.equal(
    cleanverseRejectionReason("0001", "Issue Member role required"),
    "WRITE_ACCESS_REQUIRED",
  );
  assert.equal(
    cleanverseRejectionReason("0001", "allowed_group invalid"),
    "RULE_REJECTED",
  );
  assert.equal(
    cleanverseRejectionReason("0002", "internal error"),
    "PROVIDER_UNAVAILABLE",
  );
  assert.equal(
    cleanverseFailure("OWNER_SIGN_IN_REQUIRED").title,
    "Sign in again",
  );
  const raw = "secret payload fixture";
  assert.ok(!JSON.stringify(cleanverseFailure(raw)).includes(raw));
});

const account = "0x952bbdDeCE639f678733F310890d15E28b213489";
const key = Buffer.alloc(32, 7).toString("base64");
test("Cleanverse encryption follows the documented protocol and accepts unpadded base64", () => {
  const payload = { chain: "monad", contract_address: account.toLowerCase() };
  const encrypted = encryptCleanverse(payload, key.replace(/=+$/, ""));
  // Independently generated with OpenSSL AES-256-CBC, a 32-byte 0x07 key,
  // a zero IV and default PKCS#7 padding; no provider credentials involved.
  assert.equal(
    encrypted,
    "lmaehvsKubb4SnJSBaLT+MpBxkXa9QcMvhokf8XYsNNVjnnB1iz+N6+OxmsCCpB43UM2C3Wm4sBlk6N2cygyY0ooyfruba4yqhqUZOQ7FuwdBkpPG2Lc80cTPnMHVfLD",
  );
  const decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "base64"),
    Buffer.alloc(16),
  );
  const decrypted = Buffer.concat([
    decipher.update(encrypted, "base64"),
    decipher.final(),
  ]);
  assert.deepEqual(JSON.parse(decrypted.toString()), payload);
  assert.throws(() => encryptCleanverse(payload, "invalid"));
  assert.equal(
    cleanverseOwnerMessage(account),
    `monad${account.toLowerCase()}`,
  );
});
test("Cleanverse registration requires explicit rules and rejects unrecognized fields", () => {
  const rule = {
    allowed_group: "AB",
    allowed_sub_group: "",
    min_tier: 1,
    min_sub_tier: 0,
    is_black_list: true,
    countries: [],
  };
  assert.deepEqual(parseCleanverseRule(rule), rule);
  assert.equal(
    parseCleanverseRule({ ...rule, allowed_group: "" }).allowed_group,
    "",
  );
  assert.throws(() =>
    parseCleanverseRule({ ...rule, allowed_group: "invented-group" }),
  );
  assert.throws(() => parseCleanverseRule({ ...rule, min_tier: -1 }));
  assert.throws(() => parseCleanverseRule({ ...rule, countries: ["unknown"] }));
  assert.throws(() =>
    parseCleanverseRule({ ...rule, owner_signature: "override" }),
  );
});
test("Cleanverse client fixes the sandbox target and never sends its encryption key as a header", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, input) => {
    assert.equal(
      url,
      "https://uatapi.cleanverse.com/api/cooperate/validator/register",
    );
    const headers = new Headers(input?.headers);
    assert.equal(headers.get("api-id"), "fixture-app");
    assert.equal(headers.get("api-key"), null);
    assert.ok(!String(input?.body).includes("owner_signature"));
    const envelope: unknown = JSON.parse(String(input?.body));
    assert.ok(envelope && typeof envelope === "object");
    assert.deepEqual(Object.keys(envelope), ["data"]);
    assert.ok("data" in envelope && typeof envelope.data === "string");
    const decipher = createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key, "base64"),
      Buffer.alloc(16),
    );
    const plaintext = Buffer.concat([
      decipher.update(envelope.data, "base64"),
      decipher.final(),
    ]).toString("utf8");
    assert.deepEqual(JSON.parse(plaintext), {
      contract_address: account,
      owner_signature: "fixture",
    });
    return Response.json({
      code: "0000",
      data: {
        chain: "monad",
        contract_address: account,
        tx_hash: `0x${"1".repeat(64)}`,
      },
    });
  };
  try {
    const result = await cleanverseRequest(
      "register",
      { contract_address: account, owner_signature: "fixture" },
      { CLEANVERSE_APP_ID: "fixture-app", CLEANVERSE_API_KEY: key },
    );
    assert.equal(result.hash, `0x${"1".repeat(64)}`);
  } finally {
    globalThis.fetch = original;
  }
});
test("Cleanverse response cannot establish registration for another account", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      code: "0000",
      data: {
        chain: "monad",
        contract_address: "0x0000000000000000000000000000000000000001",
        registered: true,
      },
    });
  try {
    await assert.rejects(
      cleanverseRequest(
        "is_register",
        { contract_address: account },
        { CLEANVERSE_APP_ID: "fixture-app", CLEANVERSE_API_KEY: key },
      ),
    );
  } finally {
    globalThis.fetch = original;
  }
});
