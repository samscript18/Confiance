import { readFile, writeFile } from "node:fs/promises";

// @privy-io/node 0.35.0 omits NullableHeaders and HPKESender from its declarations.
// These declarations reproduce the shapes in internal/headers.{js,mjs} and
// lib/cryptography.{js,mjs}. No runtime code changes, any, or skipped checks.
const root = new URL("../node_modules/@privy-io/node/", import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
);
if (metadata.version !== "0.35.0")
  throw new Error("Review the Privy type repair before changing SDK version.");
for (const extension of ["d.ts", "d.mts"]) {
  const headersPath = new URL(`internal/headers.${extension}`, root);
  let headers = await readFile(headersPath, "utf8");
  if (!headers.includes("export type NullableHeaders =")) {
    if (!headers.includes("export declare const buildHeaders:"))
      throw new Error("Unexpected Privy headers declaration.");
    headers = `declare const brand_privateNullableHeaders: unique symbol;\nexport type NullableHeaders = { [brand_privateNullableHeaders]: true; values: Headers; nulls: Set<string> };\n${headers}`;
    await writeFile(headersPath, headers);
  }
  const cryptoPath = new URL(`lib/cryptography.${extension}`, root);
  let crypto = await readFile(cryptoPath, "utf8");
  if (!crypto.includes("export interface HPKESender {")) {
    if (!crypto.includes("export declare namespace HPKESender {"))
      throw new Error("Unexpected Privy cryptography declaration.");
    crypto = `export interface HPKESender { encryptPayload(publicKey: Uint8Array, payload: Uint8Array): Promise<HPKESender.EncryptPayloadOutput>; }\n${crypto}`;
    await writeFile(cryptoPath, crypto);
  }
}
console.log(
  "Applied version-checked Privy declaration repair (runtime unchanged).",
);
