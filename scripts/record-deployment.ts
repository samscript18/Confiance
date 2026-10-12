import {
  createPublicClient,
  encodeDeployData,
  http,
  isHex,
  getAddress,
  type Hex,
} from "viem";
import { mkdir, writeFile } from "node:fs/promises";
import {
  confianceAbi,
  confianceBytecode,
} from "../packages/shared/contracts.js";
import {
  address,
  assertMonad,
  json,
  rpcUrl,
  targetChain,
} from "../packages/shared/config.js";

// Record only a receipt fetched from the correct chain; never from frontend guesses.
const hash = process.argv[2];
if (!hash || !isHex(hash) || hash.length !== 66)
  throw new Error("Usage: record-deployment.ts <deployment transaction hash>");
const client = createPublicClient({
  chain: targetChain,
  transport: http(rpcUrl(process.env)),
});
assertMonad(await client.getChainId());
const receipt = await client.getTransactionReceipt({ hash: hash as Hex });
if (receipt.status !== "success" || !receipt.contractAddress)
  throw new Error("No successful contract-creation receipt.");
const contract = getAddress(receipt.contractAddress);
const code = await client.getCode({ address: contract });
if (!code || code === "0x") throw new Error("Deployment has no code.");
const expectedOwner = address(process.env, "CONFIANCE_OWNER");
const owner = await client.readContract({
  address: contract,
  abi: confianceAbi,
  functionName: "owner",
});
if (owner !== expectedOwner)
  throw new Error("Owner does not match configuration.");
const transaction = await client.getTransaction({ hash: hash as Hex });
if (
  transaction.to !== null ||
  transaction.input !==
    encodeDeployData({
      abi: confianceAbi,
      bytecode: confianceBytecode,
      args: [expectedOwner],
    })
) {
  throw new Error(
    "Creation transaction does not match this compiled Confiance build and owner.",
  );
}
const result = {
  network: "Monad Testnet",
  chainId: targetChain.id,
  contract,
  owner,
  deploymentHash: hash,
  deploymentBlock: receipt.blockNumber,
  deployer: transaction.from,
  explorer: `${targetChain.blockExplorers.default.url}/tx/${hash}`,
  verification:
    "Chain, successful creation receipt, code presence and owner checked. Publish source verification separately.",
};
await mkdir("deployments", { recursive: true });
await writeFile("deployments/monad.json", json(result));
await writeFile(
  "docs/DEPLOYMENTS.md",
  `# Deployments\n\nVerified deployment receipt:\n\n\`\`\`json\n${json(result)}\n\`\`\`\n\nNo ERC-8004, Cleanverse or CRE integration is implied by this record.\n`,
);
console.log(json(result));
