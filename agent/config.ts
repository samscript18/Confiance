import { readFile } from "node:fs/promises";
import { isAddress } from "viem";
import { join } from "node:path";
import { identityCommitment } from "../packages/shared/identity.js";
/** Supplements server configuration with public IDs written by verified setup operations. */
export async function loadRuntimeEnv(
  input: NodeJS.ProcessEnv,
): Promise<NodeJS.ProcessEnv> {
  const env = { ...input };
  const root = env.CONFIANCE_PROJECT_ROOT || process.cwd();
  try {
    const value: unknown = JSON.parse(
      await readFile(join(root, "deployments/agent-wallet.json"), "utf8"),
    );
    if (
      !value ||
      typeof value !== "object" ||
      !("id" in value) ||
      typeof value.id !== "string" ||
      !("address" in value) ||
      typeof value.address !== "string" ||
      !isAddress(value.address)
    )
      throw new Error("Invalid wallet record.");
    if (!env.PRIVY_AGENT_WALLET_ID) env.PRIVY_AGENT_WALLET_ID = value.id;
    if (!env.AGENT_ADDRESS && env.PRIVY_AGENT_WALLET_ID === value.id)
      env.AGENT_ADDRESS = value.address;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
  }
  try {
    const value: unknown = JSON.parse(
      await readFile(join(root, "deployments/identity.json"), "utf8"),
    );
    if (
      !value ||
      typeof value !== "object" ||
      !("id" in value) ||
      typeof value.id !== "string" ||
      !("commitment" in value) ||
      typeof value.commitment !== "string" ||
      !/^\d+$/.test(value.id) ||
      !("registry" in value) ||
      typeof value.registry !== "string" ||
      !isAddress(value.registry) ||
      !("agent" in value) ||
      typeof value.agent !== "string" ||
      !isAddress(value.agent) ||
      !("chainId" in value) ||
      value.chainId !== 10143 ||
      identityCommitment(value.registry, BigInt(value.id)) !== value.commitment
    )
      throw new Error("Invalid identity record.");
    if (
      (env.ERC8004_IDENTITY_REGISTRY &&
        env.ERC8004_IDENTITY_REGISTRY.toLowerCase() !==
          value.registry.toLowerCase()) ||
      (env.AGENT_ADDRESS &&
        env.AGENT_ADDRESS.toLowerCase() !== value.agent.toLowerCase())
    )
      throw new Error(
        "Stored identity does not match the configured registry/agent.",
      );
    if (!env.ERC8004_AGENT_ID) env.ERC8004_AGENT_ID = value.id;
    if (!env.AGENT_IDENTITY_COMMITMENT && env.ERC8004_AGENT_ID === value.id)
      env.AGENT_IDENTITY_COMMITMENT = value.commitment;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
  }
  return env;
}
