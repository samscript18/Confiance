import {
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  getAddress,
  toEventSelector,
  http,
  type Hex,
} from "viem";
import { readRecord, writeRecord } from "../packages/shared/storage.js";
import { join } from "node:path";
import {
  identityAbi,
  identityCommitment,
} from "../packages/shared/identity.js";
import {
  address,
  assertMonad,
  required,
  rpcUrl,
  targetChain,
} from "../packages/shared/config.js";
import { connectPrivy } from "./wallet/privy.js";
export async function registerIdentity(env: NodeJS.ProcessEnv) {
  const registry = address(env, "ERC8004_IDENTITY_REGISTRY");
  const uri = required(env, "ERC8004_AGENT_URI");
  const parsed = new URL(uri);
  if (!["https:", "ipfs:"].includes(parsed.protocol))
    throw new Error("Public HTTPS/IPFS registration document required.");
  const signer = await connectPrivy(env);
  const client = createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl(env)),
  });
  assertMonad(await client.getChainId());
  const version = await client.readContract({
    address: registry,
    abi: identityAbi,
    functionName: "getVersion",
  });
  if (version !== "2.0.0")
    throw new Error("Registry ABI/version has not been reviewed.");
  const folder = join(
    env.CONFIANCE_PROJECT_ROOT || process.cwd(),
    "deployments",
  );
  const path = join(folder, "identity.json");
  try {
    const record: unknown = await readRecord(path);
    if (record === undefined)
      throw Object.assign(new Error("Missing record"), { code: "ENOENT" });
    if (
      record &&
      typeof record === "object" &&
      "id" in record &&
      typeof record.id === "string"
    ) {
      if (
        !("registry" in record) ||
        typeof record.registry !== "string" ||
        record.registry.toLowerCase() !== registry.toLowerCase() ||
        !("agent" in record) ||
        typeof record.agent !== "string" ||
        record.agent.toLowerCase() !== signer.address.toLowerCase()
      )
        throw new Error(
          "Stored identity belongs to a different registry or agent.",
        );
      const owner = await client.readContract({
        address: registry,
        abi: identityAbi,
        functionName: "ownerOf",
        args: [BigInt(record.id)],
      });
      const wallet = await client.readContract({
        address: registry,
        abi: identityAbi,
        functionName: "getAgentWallet",
        args: [BigInt(record.id)],
      });
      if (owner === signer.address && wallet === signer.address) return record;
      throw new Error("Stored registry identity no longer matches the agent.");
    }
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
  }
  const existingBalance = await client.readContract({
    address: registry,
    abi: identityAbi,
    functionName: "balanceOf",
    args: [signer.address],
  });
  if (existingBalance > 0n)
    throw new Error(
      "Agent already owns a registry identity. Record its original mint receipt before retrying.",
    );
  const data = encodeFunctionData({
    abi: identityAbi,
    functionName: "register",
    args: [uri],
  });
  await client.simulateContract({
    account: signer.address,
    address: registry,
    abi: identityAbi,
    functionName: "register",
    args: [uri],
  });
  const gas = await client.estimateContractGas({
    account: signer.address,
    address: registry,
    abi: identityAbi,
    functionName: "register",
    args: [uri],
  });
  // Fixed identity operation. Never exposed as an LLM tool or arbitrary signing endpoint.
  const hash = await signer.submitPayment(
    registry,
    data,
    (gas * 110n + 99n) / 100n,
    `identity-${registry}-${signer.address}`,
  );
  return recordIdentity(env, hash);
}
/** Recover a successful mint only after verifying its original calldata, signer, event and current binding. */
export async function recordIdentity(env: NodeJS.ProcessEnv, hash: Hex) {
  const registry = address(env, "ERC8004_IDENTITY_REGISTRY");
  const uri = required(env, "ERC8004_AGENT_URI");
  const signer = await connectPrivy(env);
  const client = createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl(env)),
  });
  assertMonad(await client.getChainId());
  if (
    (await client.readContract({
      address: registry,
      abi: identityAbi,
      functionName: "getVersion",
    })) !== "2.0.0"
  )
    throw new Error("Registry ABI/version has not been reviewed.");
  const data = encodeFunctionData({
    abi: identityAbi,
    functionName: "register",
    args: [uri],
  });
  const folder = join(
    env.CONFIANCE_PROJECT_ROOT || process.cwd(),
    "deployments",
  );
  const path = join(folder, "identity.json");
  const receipt = await client.waitForTransactionReceipt({
    hash,
    confirmations: 2,
    timeout: 120000,
  });
  if (receipt.status !== "success")
    throw new Error("Identity registration reverted.");
  const tx = await client.getTransaction({ hash });
  if (
    getAddress(tx.from) !== signer.address ||
    !tx.to ||
    getAddress(tx.to) !== registry ||
    tx.input !== data
  )
    throw new Error("Identity transaction does not match.");
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== registry) continue;
    // The registry also emits ERC-721 Transfer logs; decode only its registration event.
    if (log.topics[0] !== toEventSelector("Registered(uint256,string,address)"))
      continue;
    const event = decodeEventLog({
      abi: identityAbi,
      data: log.data,
      topics: log.topics,
      strict: false,
    });
    if (
      event.eventName !== "Registered" ||
      !event.args.owner ||
      getAddress(event.args.owner) !== signer.address ||
      event.args.agentId === undefined
    )
      continue;
    const id = event.args.agentId;
    const wallet = await client.readContract({
      address: registry,
      abi: identityAbi,
      functionName: "getAgentWallet",
      args: [id],
    });
    if (getAddress(wallet) !== signer.address)
      throw new Error("Identity wallet binding failed.");
    const owner = await client.readContract({
      address: registry,
      abi: identityAbi,
      functionName: "ownerOf",
      args: [id],
    });
    if (getAddress(owner) !== signer.address)
      throw new Error("Identity ownership binding failed.");
    const record = {
      id: id.toString(),
      registry,
      agent: signer.address,
      uri,
      commitment: identityCommitment(registry, id),
      hash,
      block: receipt.blockNumber.toString(),
      chainId: 10143,
    };

    await writeRecord(path, record);
    return record;
  }
  throw new Error("No matching registration event.");
}
