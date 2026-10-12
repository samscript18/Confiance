import { relayBackend } from "../../../lib/backend";
import { writeRecord } from "../../../../../packages/shared/storage";
import { join } from "node:path";
import { PrivyClient } from "@privy-io/node";
import { isAddress, getAddress } from "viem";
import { requireOwner } from "../../../lib/auth";
import { publicResponse } from "../../../lib/server";
import { runtimeEnv } from "../../../lib/settings";
import { required } from "../../../../../packages/shared/config";
import { runConfiguredPayroll } from "../../../../../agent/runtime/service";
import { registerIdentity } from "../../../../../agent/identity";
import { attacks, runAttack } from "../../../../../agent/diagnostic";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  const relay = await relayBackend(request);
  if (relay) return relay;
  try {
    const owner = await requireOwner(request);
    const env = await runtimeEnv();
    const action = new URL(request.url).searchParams.get("action");
    if (action === "wallet") {
      const privy = new PrivyClient({
        appId: required(env, "PRIVY_APP_ID"),
        appSecret: required(env, "PRIVY_APP_SECRET"),
      });
      const wallet = env.PRIVY_AGENT_WALLET_ID
        ? await privy.wallets().get(env.PRIVY_AGENT_WALLET_ID)
        : await privy.wallets().create({
            chain_type: "ethereum",
            display_name: "Confiance Payroll Agent",
            idempotency_key: `confiance-payroll-${owner.toLowerCase()}`,
          });
      if (
        wallet.chain_type !== "ethereum" ||
        !isAddress(wallet.address) ||
        getAddress(wallet.address) === owner
      )
        throw new Error("Independent EVM agent wallet required.");
      const folder = join(
        env.CONFIANCE_PROJECT_ROOT || process.cwd(),
        "deployments",
      );
      await writeRecord(join(folder, "agent-wallet.json"), {
        id: wallet.id,
        address: getAddress(wallet.address),
      });
      return publicResponse({ id: wallet.id, address: wallet.address });
    }
    if (action === "identity")
      return publicResponse(await registerIdentity(env));
    if (action && Object.hasOwn(attacks, action))
      return publicResponse(
        await runAttack(env, action as keyof typeof attacks),
      );
    if (action !== "run") throw new Error("Unknown action.");
    return publicResponse(await runConfiguredPayroll(env));
  } catch {
    return publicResponse(
      {
        error:
          "Agent operation unavailable. Check provider configuration, owner sign-in, funding and pending payment proofs.",
      },
      409,
    );
  }
}
