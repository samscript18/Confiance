import { PrivyClient } from "@privy-io/node";
import {
  getAddress,
  isAddress,
  isHex,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { required } from "../../packages/shared/config.js";

/** Server-only signer. Exposes no key, arbitrary signer call, or owner operation to the LLM. */
export async function connectPrivy(env: NodeJS.ProcessEnv) {
  const privy = new PrivyClient({
    appId: required(env, "PRIVY_APP_ID"),
    appSecret: required(env, "PRIVY_APP_SECRET"),
  });
  const walletId = required(env, "PRIVY_AGENT_WALLET_ID");
  const wallet = await privy.wallets().get(walletId);
  if (wallet.chain_type !== "ethereum" || !isAddress(wallet.address))
    throw new Error("Privy wallet must be an Ethereum agent wallet.");
  const agent = getAddress(wallet.address);
  if (
    env.AGENT_ADDRESS &&
    (!isAddress(env.AGENT_ADDRESS) || getAddress(env.AGENT_ADDRESS) !== agent)
  )
    throw new Error(
      "Configured agent address does not match the Privy wallet.",
    );
  if (
    env.CONFIANCE_OWNER &&
    isAddress(env.CONFIANCE_OWNER) &&
    getAddress(env.CONFIANCE_OWNER) === agent
  )
    throw new Error("Owner and agent must have separate wallets.");
  return {
    address: agent,
    async submitPayment(
      contract: Address,
      calldata: Hex,
      gas: bigint,
      idempotencyKey: string,
    ): Promise<Hex> {
      const result = await privy
        .wallets()
        .ethereum()
        .sendTransaction(walletId, {
          caip2: "eip155:10143",
          params: {
            transaction: {
              to: contract,
              from: agent,
              data: calldata,
              value: "0x0",
              chain_id: 10143,
              gas_limit: `0x${gas.toString(16)}`,
            },
          },
          idempotency_key: keccak256(stringToHex(idempotencyKey)).slice(2),
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
      ) {
        throw new Error(
          "Privy did not return a Monad Testnet transaction hash.",
        );
      }
      return result.hash;
    },
  };
}
