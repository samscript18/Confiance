import { relayBackend } from "../../../lib/backend";
import { isHex, verifyMessage, parseAbi } from "viem";
import {
  readRecord,
  writeRecord,
} from "../../../../../packages/shared/storage";
import { join } from "node:path";
import { requireOwner } from "../../../lib/auth";
import { checkedClient, publicResponse } from "../../../lib/server";
import { runtimeEnv } from "../../../lib/settings";
import { address } from "../../../../../packages/shared/config";
import {
  cleanverseOwnerMessage,
  cleanverseRequest,
  parseCleanverseRule,
  CleanverseRequestError,
} from "../../../../../packages/shared/cleanverse";

export const runtime = "nodejs";
const validator = "0xA64529732B52EFFD2B245320E88226D72c23b788";
const abi = parseAbi(["function isRegistered(address) view returns (bool)"]);
const state = globalThis as typeof globalThis & {
  confianceCleanverseBusy?: boolean;
};
export async function POST(request: Request) {
  const relay = await relayBackend(request);
  if (relay) return relay;
  let locked = false;
  let phase: "owner" | "connection" | "input" | "provider" = "owner";
  try {
    const owner = await requireOwner(request);
    phase = "connection";
    const env = await runtimeEnv();
    const account = address(env, "CONFIANCE_ADDRESS");
    const client = await checkedClient();
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || !("action" in value))
      return publicResponse({ error: "Choose a registration action." }, 400);
    const body = { chain: "monad", contract_address: account.toLowerCase() };
    const onchain = await client.readContract({
      address: validator,
      abi,
      functionName: "isRegistered",
      args: [account],
    });
    if (value.action === "status") {
      const api = await cleanverseRequest("is_register", body, env);
      let lastAttempt: unknown;
      try {
        lastAttempt = await readRecord(
          join(
            env.CONFIANCE_PROJECT_ROOT || process.cwd(),
            "deployments",
            "cleanverse-registration.json",
          ),
        );
      } catch {
        /* Optional diagnostic history is not authorization state. */
      }
      return publicResponse({
        account,
        onchain,
        apiRegistered: api.registered ?? null,
        code: api.code,
        reason: api.reason,
        ...(api.code !== "0000" ? { status: "rejected" } : {}),
        lastAttempt,
      });
    }
    if (
      value.action !== "register" ||
      !("rule" in value) ||
      !("signature" in value) ||
      typeof value.signature !== "string" ||
      !isHex(value.signature)
    )
      return publicResponse(
        { error: "Review the rules and sign with your owner passkey." },
        400,
      );
    phase = "input";
    const rule = parseCleanverseRule(value.rule);
    if (onchain) return publicResponse({ status: "registered", account });
    if (
      !(await verifyMessage({
        address: owner,
        message: cleanverseOwnerMessage(account),
        signature: value.signature,
      }))
    )
      return publicResponse(
        {
          error:
            "The registration signature must come from this account’s owner.",
          reason: "SIGNATURE_REJECTED",
        },
        403,
      );
    if (state.confianceCleanverseBusy)
      return publicResponse(
        {
          error:
            "Registration is already pending. Check its status before retrying.",
          reason: "REGISTRATION_PENDING",
        },
        409,
      );
    state.confianceCleanverseBusy = true;
    locked = true;
    phase = "provider";
    const previous = await cleanverseRequest("is_register", body, env);
    if (previous.code !== "0000" || previous.registered)
      return publicResponse({
        status: previous.registered ? "awaiting_chain" : "rejected",
        code: previous.code,
        reason: previous.reason,
        account,
      });
    const result = await cleanverseRequest(
      "register",
      { ...body, rule, owner_signature: value.signature },
      env,
    );
    if (result.code !== "0000") {
      const folder = join(
        env.CONFIANCE_PROJECT_ROOT || process.cwd(),
        "deployments",
      );

      await writeRecord(join(folder, "cleanverse-registration.json"), {
        account,
        chainId: 10143,
        timestamp: new Date().toISOString(),
        status: "rejected",
        code: result.code,
        reason: result.reason,
      });
      return publicResponse(
        { status: "rejected", code: result.code, reason: result.reason },
        422,
      );
    }
    // API acceptance alone never establishes eligibility or a successful transfer.
    const registered = await client.readContract({
      address: validator,
      abi,
      functionName: "isRegistered",
      args: [account],
    });
    return publicResponse({
      status: registered ? "registered" : "submitted",
      account,
      hash: result.hash,
    });
  } catch (error) {
    if (error instanceof CleanverseRequestError) {
      try {
        const folder = join(
          process.env.CONFIANCE_PROJECT_ROOT || process.cwd(),
          "deployments",
        );

        await writeRecord(join(folder, "cleanverse-registration.json"), {
          account: process.env.CONFIANCE_ADDRESS,
          chainId: 10143,
          timestamp: new Date().toISOString(),
          status: "unconfirmed",
          reason: error.reason,
          endpoint: error.endpoint,
          httpStatus: error.httpStatus,
          requestId: error.requestId,
        });
      } catch {
        /* Diagnostic storage failure does not change registration status. */
      }
      return publicResponse(
        {
          error: "Cleanverse could not confirm registration.",
          reason: error.reason,
          providerHttpStatus: error.httpStatus,
          reference: error.requestId,
        },
        502,
      );
    }
    return publicResponse(
      {
        error:
          "Registration could not be confirmed. Check owner sign-in, eligibility rules and registration status before retrying.",
        reason:
          phase === "owner"
            ? "OWNER_SIGN_IN_REQUIRED"
            : phase === "input"
              ? "INVALID_REQUEST"
              : "REQUEST_UNCONFIRMED",
      },
      409,
    );
  } finally {
    if (locked) state.confianceCleanverseBusy = false;
  }
}
