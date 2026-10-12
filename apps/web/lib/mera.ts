import {
  createPasskeyWithPrfOutput,
  getPasskeyPrfOutput,
  createSecp256k1SigningSession,
  isMeraError,
  type PasskeyCredentialMetadata,
  type Secp256k1SigningSession,
} from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { BaseError } from "viem";

let session: Secp256k1SigningSession | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
const sessionListeners = new Set<() => void>();
export function subscribeOwnerSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}
export function ownerSessionActive() {
  return Boolean(session);
}
export function hasOwnerCredential() {
  return Boolean(knownCredential());
}
const credentialKey = "confiance.owner.credential.v1";
function knownCredential(): PasskeyCredentialMetadata | undefined {
  const stored = localStorage.getItem(credentialKey);
  if (!stored) return undefined;
  const value: unknown = JSON.parse(stored);
  if (
    !value ||
    typeof value !== "object" ||
    !("credentialId" in value) ||
    typeof value.credentialId !== "string"
  )
    throw new Error("Stored passkey metadata is invalid.");
  return { credentialId: value.credentialId };
}
export function disconnectOwner() {
  clearTimeout(timer);
  session?.end();
  session = undefined;
  for (const listener of sessionListeners) listener();
}
export function ownerAccount() {
  if (!session) throw new Error("Sign in with your passkey again.");
  return toViemAccount(session);
}
export async function connectOwner(create: boolean) {
  if (!window.isSecureContext || !window.PublicKeyCredential)
    throw new Error("Use HTTPS or localhost with a passkey-capable browser.");
  const credential = knownCredential();
  if (create && credential)
    throw new Error(
      "A passkey already exists here. Use Sign in to recover the same owner.",
    );
  disconnectOwner();
  const result = create
    ? await createPasskeyWithPrfOutput({
        rp: { id: location.hostname, name: "Confiance" },
        user: { name: "Confiance owner", displayName: "Confiance owner" },
      })
    : await getPasskeyPrfOutput({
        rpId: location.hostname,
        ...(credential ? { credential } : {}),
      });
  let seed: Uint8Array | undefined;
  let master: HDKey | undefined;
  let derived: HDKey | undefined;
  let key: Uint8Array | null = null;
  try {
    // Match the documented portable Mera BIP-44 derivation; never persist root/key material.
    seed = mnemonicToSeedSync(entropyToMnemonic(result.prfOutput, wordlist));
    master = HDKey.fromMasterSeed(seed);
    derived = master.derive("m/44'/60'/0'/0/0");
    key = derived.privateKey;
    if (!key) throw new Error("Passkey account derivation failed.");
    session = createSecp256k1SigningSession({ privateKey: key });
    localStorage.setItem(
      credentialKey,
      JSON.stringify({ credentialId: result.credentialId }),
    );
    timer = setTimeout(disconnectOwner, 10 * 60 * 1000);
    return ownerAccount().address;
  } catch (error) {
    disconnectOwner();
    throw error;
  } finally {
    key?.fill(0);
    seed?.fill(0);
    result.prfOutput.fill(0);
    derived?.wipePrivateData();
    master?.wipePrivateData();
  }
}
export function ownerError(error: unknown): string {
  if (error instanceof BaseError)
    return "The transaction could not be prepared. Check the current session policy, Monad Testnet connection, and wallet funding.";
  if (isMeraError(error)) {
    if (error.code === "PRF_UNAVAILABLE")
      return "This authenticator does not return PRF. Use a supported iCloud Keychain, 1Password, or Google Password Manager passkey. Chrome local-profile passkeys may fail.";
    if (error.code === "SESSION_ENDED")
      return "Your signing session ended. Sign in again.";
    if (error.code === "PASSKEY_OPERATION_FAILED")
      return "The passkey prompt was cancelled or failed. You can retry.";
    return "Passkey authentication is unavailable in this browser.";
  }
  return error instanceof Error
    ? error.message
    : "The operation could not be completed.";
}
