import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createPublicClient, http, isAddress, isHex } from "viem";
import { confianceAbi } from "../packages/shared/contracts.js";
import { assertMonad, rpcUrl, targetChain } from "../packages/shared/config.js";
const record: unknown = JSON.parse(
  await readFile("deployments/monad.json", "utf8"),
);
if (
  !record ||
  typeof record !== "object" ||
  !("chainId" in record) ||
  record.chainId !== 10143 ||
  !("contract" in record) ||
  typeof record.contract !== "string" ||
  !isAddress(record.contract) ||
  !("deploymentHash" in record) ||
  typeof record.deploymentHash !== "string" ||
  !isHex(record.deploymentHash)
)
  throw new Error("A verified Monad deployment record is required.");
const client = createPublicClient({
  chain: targetChain,
  transport: http(rpcUrl(process.env)),
});
assertMonad(await client.getChainId());
const receipt = await client.getTransactionReceipt({
  hash: record.deploymentHash,
});
if (
  receipt.status !== "success" ||
  receipt.contractAddress?.toLowerCase() !== record.contract.toLowerCase()
)
  throw new Error("Deployment record does not match the live receipt.");
await mkdir("indexer/abis", { recursive: true });
await writeFile("indexer/abis/Confiance.json", JSON.stringify(confianceAbi));
const events = confianceAbi
  .filter((item) => item.type === "event")
  .map((item) => `      - event: ${item.name}`)
  .join("\n");
await writeFile(
  "indexer/config.yaml",
  `name: confiance\ndescription: Confiance activity on Monad Testnet\nhandlers: ./src/handlers\ncontracts:\n  - name: Confiance\n    abi_file_path: ./abis/Confiance.json\n    events:\n${events}\nfield_selection:\n  transaction_fields:\n    - hash\nchains:\n  - id: 10143\n    start_block: ${receipt.blockNumber}\n    block_lag: 2\n    rpc: \"\u0024{ENVIO_MONAD_RPC_URL}\"\n    contracts:\n      - name: Confiance\n        address: \"${record.contract}\"\n`,
);
console.log(
  "Indexer configuration derived from a live deployment receipt. Run Envio codegen, then start the indexer.",
);
