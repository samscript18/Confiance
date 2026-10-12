import { relayBackend } from "../../../lib/backend";
import { address } from "../../../../../packages/shared/config";
import { confianceAbi } from "../../../../../packages/shared/contracts";
import { checkedClient, publicResponse } from "../../../lib/server";
import { runtimeEnv } from "../../../lib/settings";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const relay = await relayBackend(request);
  if (relay) return relay;
  try {
    const env = await runtimeEnv();
    const agent = address(env, "AGENT_ADDRESS");
    let active = false;
    if (env.CONFIANCE_ADDRESS) {
      const client = await checkedClient();
      const session = await client.readContract({
        address: address(env, "CONFIANCE_ADDRESS"),
        abi: confianceAbi,
        functionName: "getSession",
        args: [agent],
      });
      const block = await client.getBlock();
      active = session.active && session.policy.expiry > block.timestamp;
    }
    const origin = new URL(env.WEB_ORIGIN || "http://localhost:3000");
    return publicResponse({
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: "Payroll Agent",
      description:
        "Pays the configured contractor through Confiance after an authorized milestone report. Financial authority is enforced by Confiance on Monad Testnet.",
      services: [
        { name: "web", endpoint: origin.toString() },
        { name: "agentWallet", endpoint: `eip155:10143:${agent}` },
      ],
      active,
      x402Support: false,
      registrations:
        env.ERC8004_AGENT_ID && env.ERC8004_IDENTITY_REGISTRY
          ? [
              {
                agentId: Number(env.ERC8004_AGENT_ID),
                agentRegistry: `eip155:10143:${address(env, "ERC8004_IDENTITY_REGISTRY")}`,
              },
            ]
          : [],
    });
  } catch {
    return publicResponse(
      {
        error:
          "Agent registration metadata is unavailable until the actual wallet is configured.",
      },
      503,
    );
  }
}
