import { PrivyClient } from "@privy-io/node";
import {
  createPublicClient,
  encodeDeployData,
  getAddress,
  http,
  isHex,
  keccak256,
} from "viem";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { connectPrivy } from "../agent/wallet/privy.js";
import { loadRuntimeEnv } from "../agent/config.js";
import {
  confianceAbi,
  confianceBytecode,
} from "../packages/shared/contracts.js";
import {
  address,
  assertMonad,
  json,
  required,
  rpcUrl,
  targetChain,
} from "../packages/shared/config.js";

// Fixed setup deployment only. Never exposed as a payroll/LLM tool.
const env = await loadRuntimeEnv(process.env);
if (env.CONFIANCE_ADDRESS)
  throw new Error(
    "A Confiance address is already configured; verify it instead of redeploying.",
  );
const signer = await connectPrivy(env);
const owner = address(env, "CONFIANCE_OWNER");
const client = createPublicClient({
  chain: targetChain,
  transport: http(rpcUrl(env)),
});
assertMonad(await client.getChainId());
const data = encodeDeployData({
  abi: confianceAbi,
  bytecode: confianceBytecode,
  args: [owner],
});
await client.estimateGas({ account: signer.address, data });
await mkdir("deployments", { recursive: true });
let hash: `0x${string}`;
try {
  const record: unknown = JSON.parse(
    await readFile("deployments/pending-deployment.json", "utf8"),
  );
  if (
    !record ||
    typeof record !== "object" ||
    !("hash" in record) ||
    typeof record.hash !== "string" ||
    !isHex(record.hash) ||
    record.hash.length !== 66
  )
    throw new Error("Invalid pending deployment proof.");
  hash = record.hash;
} catch (error) {
  if (
    !(error instanceof Error) ||
    !("code" in error) ||
    error.code !== "ENOENT"
  )
    throw error;
  const privy = new PrivyClient({
    appId: required(env, "PRIVY_APP_ID"),
    appSecret: required(env, "PRIVY_APP_SECRET"),
  });
  const result = await privy
    .wallets()
    .ethereum()
    .sendTransaction(required(env, "PRIVY_AGENT_WALLET_ID"), {
      caip2: "eip155:10143",
      params: {
        transaction: {
          from: signer.address,
          data,
          value: "0x0",
          chain_id: 10143,
        },
      },
      idempotency_key: keccak256(data).slice(2),
      ...(env.PRIVY_AUTHORIZATION_KEY
        ? {
            authorization_context: {
              authorization_private_keys: [env.PRIVY_AUTHORIZATION_KEY],
            },
          }
        : {}),
    });
  if (
    result.caip2 !== "eip155:10143" ||
    !isHex(result.hash) ||
    result.hash.length !== 66
  )
    throw new Error("No Monad deployment hash returned.");
  hash = result.hash;
  await writeFile(
    "deployments/pending-deployment.json",
    json({ hash, owner, deployer: signer.address, chainId: 10143 }),
  );
}
const receipt = await client.waitForTransactionReceipt({
  hash,
  confirmations: 2,
  timeout: 120000,
});
if (receipt.status !== "success" || !receipt.contractAddress)
  throw new Error("Deployment failed.");
const tx = await client.getTransaction({ hash });
if (
  getAddress(tx.from) !== signer.address ||
  tx.to !== null ||
  tx.input !== data
)
  throw new Error("Deployment does not match the fixed setup request.");
const actualOwner = await client.readContract({
  address: receipt.contractAddress,
  abi: confianceAbi,
  functionName: "owner",
});
if (getAddress(actualOwner) !== owner)
  throw new Error("Deployed owner differs from configuration.");
console.log(
  json({
    hash,
    contract: receipt.contractAddress,
    owner,
    block: receipt.blockNumber,
    chainId: 10143,
  }),
);
