import { createPublicClient, getAddress, http, isAddress } from "viem";
import { monadTestnet } from "viem/chains";
import { mkdir, writeFile } from "node:fs/promises";
import { assertMonad, json } from "../packages/shared/config.js";

// Read-only, documented sandbox endpoint. Deliberately exclude returned RPC URLs and operator metadata.
const response = await fetch(
  "https://uatapi.cleanverse.com/api/skills/query_chain_config",
  { signal: AbortSignal.timeout(15000) },
);
if (!response.ok) throw new Error("Cleanverse sandbox unavailable.");
const result: unknown = await response.json();
if (!result || typeof result !== "object")
  throw new Error("Invalid Cleanverse response.");
const root = result as Record<string, unknown>;
const data = root.data as { chains?: Record<string, unknown>[] } | undefined;
if (root.code !== "0000" || !Array.isArray(data?.chains))
  throw new Error("Invalid chain configuration.");
const monad = data.chains.find(
  (item) => item.chain === "monad" && item.chain_id === 10143,
);
if (!monad) throw new Error("No Monad testnet sandbox configuration.");
const client = createPublicClient({
  chain: monadTestnet,
  transport: http("https://testnet-rpc.monad.xyz"),
});
assertMonad(await client.getChainId());
async function inspect(value: unknown) {
  if (typeof value !== "string" || !isAddress(value))
    return { address: null, hasCode: false };
  const address = getAddress(value);
  const code = await client.getCode({ address });
  return { address, hasCode: Boolean(code && code !== "0x") };
}
const tokens = Array.isArray(monad.tokens)
  ? (monad.tokens as Record<string, unknown>[])
  : [];
const snapshot = {
  source: "https://uatapi.cleanverse.com/api/skills/query_chain_config",
  observedAt: new Date().toISOString(),
  chainId: 10143,
  apass: await inspect(monad.apass_address),
  policy: await inspect(monad.atoken_policy),
  tokens: await Promise.all(
    tokens.map(async (token) => ({
      symbol: token.symbol,
      category: token.token_category,
      decimals: token.decimals,
      contract: await inspect(token.token_address),
      accessCore: await inspect(token.access_core),
    })),
  ),
  limitation:
    "Deployed code is not proof of ABI, smart-account enrollment, recipient eligibility, or compliance. No transfer attempted.",
};
await mkdir("docs/research", { recursive: true });
await writeFile("docs/research/cleanverse-sandbox.json", json(snapshot));
console.log(json(snapshot));
