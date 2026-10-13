import type { Feedback } from "./feedback.js";
export function cleanverseFailure(
  reason: unknown,
  reference?: unknown,
): Feedback {
  const messages: Record<string, [string, string]> = {
    PROVIDER_HTTP_FORBIDDEN: [
      "Cleanverse blocked this request",
      "Cleanverse rejected the registration request without a usable explanation. Registration is not confirmed. Share the request reference with Cleanverse so they can investigate this specific attempt.",
    ],
    PROVIDER_RESPONSE_INVALID: [
      "Cleanverse returned an unexpected response",
      "The service did not return a usable registration response. Check registration status before retrying; no successful enrollment is confirmed.",
    ],
    OWNER_SIGN_IN_REQUIRED: [
      "Sign in again",
      "Your owner sign-in could not be verified. Sign in with your existing passkey before checking or registering this account.",
    ],
    SIGNATURE_REJECTED: [
      "Owner signature wasn’t accepted",
      "Cleanverse could not validate the account owner’s signature. The account remains unenrolled; we need to verify their ownership-signature requirements before resubmitting.",
    ],
    ENCRYPTION_REJECTED: [
      "Cleanverse couldn’t read the request",
      "Cleanverse rejected the encrypted request. Check that the API key belongs to this sandbox App ID.",
    ],
    WRITE_ACCESS_REQUIRED: [
      "Registration access is required",
      "Cleanverse reports that these credentials do not have the permission required for registration. Ask Cleanverse to enable the documented Issue Member access for this sandbox app.",
    ],
    RULE_REJECTED: [
      "Eligibility rules weren’t accepted",
      "Cleanverse rejected the selected eligibility rules. Review the issuer group, minimum tiers and country selection before trying again.",
    ],
    CREDENTIALS_OR_ALLOWLIST: [
      "Cleanverse access wasn’t accepted",
      "Cleanverse rejected the app credentials or server access. Confirm the sandbox App ID and their outbound-IP allowlist.",
    ],
    PROVIDER_UNAVAILABLE: [
      "Cleanverse is unavailable",
      "Cleanverse reported an internal service error. Check registration status before retrying later; no registration success is confirmed.",
    ],
    INVALID_REQUEST: [
      "Review the registration details",
      "Choose valid eligibility rules and sign with the owner of this Confiance account.",
    ],
    REQUEST_UNCONFIRMED: [
      "Registration couldn’t be checked",
      "The registration service or Monad connection could not confirm the request. Check status before submitting again.",
    ],
    REGISTRATION_PENDING: [
      "Registration is already pending",
      "Check registration status before submitting another request.",
    ],
  };
  const [title, message] =
    typeof reason === "string" && Object.hasOwn(messages, reason)
      ? messages[reason]!
      : [
          "Cleanverse rejected registration",
          "Cleanverse rejected the request without a recognized explanation. No successful registration is confirmed. The response reference has been saved for investigation.",
        ];
  return {
    title,
    message,
    tone: "error",
    ...(typeof reference === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      reference,
    )
      ? {
          nextStep: `For Cleanverse support, quote this request reference: ${reference}.`,
        }
      : {}),
  };
}
