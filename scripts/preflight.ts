import { createPublicClient, http } from "viem";
import {
  required,
  address,
  rpcUrl,
  assertMonad,
  targetChain,
  json,
} from "../packages/shared/config.js";
import { confianceAbi } from "../packages/shared/contracts.js";
import { loadRuntimeEnv } from "../agent/config.js";
const env = await loadRuntimeEnv(process.env);

const groups: Readonly<Record<string, readonly string[]>> = {
  chain: [
    "MONAD_RPC_URL",
    "CONFIANCE_ADDRESS",
    "PAYMENT_ASSET",
    "PAYMENT_RECIPIENT",
  ],
  privy: ["PRIVY_APP_ID", "PRIVY_APP_SECRET", "PRIVY_AGENT_WALLET_ID"],
  llm: ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"],
  github: ["GITHUB_REPO", "GITHUB_PR_NUMBER"],
  cre: [
    "CHAINLINK_CRE_FORWARDER",
    "CHAINLINK_CRE_WORKFLOW_ID",
    "CHAINLINK_CRE_WORKFLOW_OWNER",
  ],
  cleanverse: [
    "CLEANVERSE_A_TOKEN",
    "CLEANVERSE_APASS_CONTRACT",
    "CLEANVERSE_CCP",
    "CLEANVERSE_ADAPTER",
  ],
  identity: ["ERC8004_IDENTITY_REGISTRY", "ERC8004_AGENT_URI"],
  owner: ["CONFIANCE_OWNER", "WEB_ORIGIN"],
  indexer: ["ENVIO_GRAPHQL_URL"],
};
let missing = false;
for (const [group, names] of Object.entries(groups)) {
  const absent = names.filter((name) => !env[name]?.trim());
  console.log(
    `${group}: ${absent.length ? `missing ${absent.join(", ")}` : "configured — not yet live verified"}`,
  );
  missing ||= absent.length > 0;
}
if (process.env.MONAD_RPC_URL) {
  try {
    if (process.env.MONAD_CHAIN_ID)
      assertMonad(Number(required(process.env, "MONAD_CHAIN_ID")));
    const client = createPublicClient({
      chain: targetChain,
      transport: http(rpcUrl(process.env)),
    });
    assertMonad(await client.getChainId());
    console.log("RPC verified: Monad Testnet (10143).");
    if (process.env.CONFIANCE_ADDRESS) {
      const contract = address(process.env, "CONFIANCE_ADDRESS");
      const code = await client.getCode({ address: contract });
      if (!code || code === "0x") throw new Error("No deployed code.");
      const owner = await client.readContract({
        address: contract,
        abi: confianceAbi,
        functionName: "owner",
      });
      console.log(json({ verifiedContract: contract, owner }));
    }
  } catch {
    console.log(
      "Chain verification failed; no deployment or payment has been proven.",
    );
    process.exitCode = 1;
  }
}
if (missing) process.exitCode = 1;
