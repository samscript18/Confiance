import { createCipheriv, randomUUID } from "node:crypto";
import { getAddress, isAddress, type Address } from "viem";

export interface CleanverseRule {
  allowed_group: string;
  allowed_sub_group: string;
  min_tier: number;
  min_sub_tier: number;
  is_black_list: boolean;
  countries: string[];
}
export class CleanverseRequestError extends Error {
  constructor(
    public readonly reason: string,
    public readonly endpoint: string,
    public readonly httpStatus?: number,
    public readonly requestId?: string,
  ) {
    super("Cleanverse request could not be confirmed.");
  }
}
// Classify provider text without returning or logging arbitrary response content.
export function cleanverseRejectionReason(
  code: string,
  message: unknown,
): string {
  const text = typeof message === "string" ? message.toLowerCase() : "";
  if (/signature/.test(text)) return "SIGNATURE_REJECTED";
  if (/decrypt|encrypt|padding|aes/.test(text)) return "ENCRYPTION_REJECTED";
  if (/role|issue member|permission|privilege/.test(text))
    return "WRITE_ACCESS_REQUIRED";
  if (/group|tier|country|countries|rule/.test(text)) return "RULE_REJECTED";
  if (code === "0003") return "CREDENTIALS_OR_ALLOWLIST";
  if (code === "0002") return "PROVIDER_UNAVAILABLE";
  return "PROVIDER_REJECTED";
}
export function parseCleanverseRule(value: unknown): CleanverseRule {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Choose an eligibility rule.");
  const r = value as Record<string, unknown>;
  const fields = [
    "allowed_group",
    "allowed_sub_group",
    "min_tier",
    "min_sub_tier",
    "is_black_list",
    "countries",
  ];
  if (
    Object.keys(r).some((k) => !fields.includes(k)) ||
    typeof r.allowed_group !== "string" ||
    !/^([A-Za-z]{2})?$/.test(r.allowed_group) ||
    typeof r.allowed_sub_group !== "string" ||
    !/^([A-Za-z]{2})?$/.test(r.allowed_sub_group) ||
    typeof r.min_tier !== "number" ||
    !Number.isSafeInteger(r.min_tier) ||
    r.min_tier < 0 ||
    r.min_tier > 255 ||
    typeof r.min_sub_tier !== "number" ||
    !Number.isSafeInteger(r.min_sub_tier) ||
    r.min_sub_tier < 0 ||
    r.min_sub_tier > 255 ||
    typeof r.is_black_list !== "boolean" ||
    !Array.isArray(r.countries) ||
    r.countries.length > 250 ||
    !r.countries.every(
      (c: unknown) => typeof c === "string" && /^[A-Z]{2}$/.test(c),
    )
  )
    throw new Error("Review the group, tiers and country codes.");
  return {
    allowed_group: r.allowed_group,
    allowed_sub_group: r.allowed_sub_group,
    min_tier: r.min_tier,
    min_sub_tier: r.min_sub_tier,
    is_black_list: r.is_black_list,
    countries: [...new Set(r.countries as string[])],
  };
}
export function cleanverseOwnerMessage(account: Address): string {
  return `monad${getAddress(account).toLowerCase()}`;
}
export function encryptCleanverse(value: unknown, apiKey: string): string {
  const text = apiKey.trim();
  const key = Buffer.from(text, "base64");
  try {
    if (
      key.length !== 32 ||
      key.toString("base64").replace(/=+$/, "") !== text.replace(/=+$/, "")
    )
      throw new Error("Cleanverse encryption configuration is invalid.");
    // The fixed zero IV is required by Cleanverse's API protocol.
    const cipher = createCipheriv("aes-256-cbc", key, Buffer.alloc(16));
    return Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]).toString("base64");
  } finally {
    key.fill(0);
  }
}
export function cleanverseCredentials(env: Record<string, string | undefined>) {
  const id = (env.CLEANVERSE_APP_ID || env.CLEANVERSE_API_ID)?.trim();
  const key = env.CLEANVERSE_API_KEY?.trim();
  if (!id || !key)
    throw new Error("Configure Cleanverse credentials on the server.");
  return { id, key };
}
export async function cleanverseRequest(
  endpoint: "is_register" | "register",
  body: unknown,
  env: Record<string, string | undefined>,
): Promise<{
  code: string;
  reason?: string;
  registered?: boolean;
  hash?: `0x${string}`;
}> {
  const { id, key } = cleanverseCredentials(env);
  const requestId = randomUUID();
  const response = await fetch(
    `https://uatapi.cleanverse.com/api/cooperate/validator/${endpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-id": id,
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(
        endpoint === "register" ? { data: encryptCleanverse(body, key) } : body,
      ),
      signal: AbortSignal.timeout(25000),
      redirect: "error",
    },
  );
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new CleanverseRequestError(
      response.status === 403
        ? "PROVIDER_HTTP_FORBIDDEN"
        : "PROVIDER_RESPONSE_INVALID",
      endpoint,
      response.status,
      requestId,
    );
  }
  if (
    !response.ok ||
    !result ||
    typeof result !== "object" ||
    !("code" in result) ||
    typeof result.code !== "string" ||
    !/^\d{4}$/.test(result.code)
  )
    throw new CleanverseRequestError(
      response.status === 403
        ? "PROVIDER_HTTP_FORBIDDEN"
        : "PROVIDER_RESPONSE_INVALID",
      endpoint,
      response.status,
      requestId,
    );
  if (result.code !== "0000")
    return {
      code: result.code,
      reason: cleanverseRejectionReason(
        result.code,
        "message" in result ? result.message : undefined,
      ),
    };
  if (!("data" in result) || !result.data || typeof result.data !== "object")
    throw new Error("Cleanverse returned an incomplete response.");
  const d = result.data as Record<string, unknown>;
  const b = body as Record<string, unknown>;
  if (
    d.chain !== "monad" ||
    typeof d.contract_address !== "string" ||
    !isAddress(d.contract_address) ||
    typeof b.contract_address !== "string" ||
    d.contract_address.toLowerCase() !== b.contract_address.toLowerCase()
  )
    throw new Error("Cleanverse response does not match this account.");
  if (endpoint === "is_register") {
    if (typeof d.registered !== "boolean")
      throw new Error("Registration status unavailable.");
    return { code: result.code, registered: d.registered };
  }
  if (typeof d.tx_hash !== "string" || !/^0x[0-9a-f]{64}$/i.test(d.tx_hash))
    throw new Error(
      "Registration receipt unavailable. Check status before retrying.",
    );
  return { code: result.code, hash: d.tx_hash as `0x${string}` };
}
