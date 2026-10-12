import "server-only";
import { createPublicClient, http } from "viem";
import {
  address,
  assertMonad,
  rpcUrl,
  targetChain,
} from "../../../packages/shared/config";
export function chainClient() {
  return createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl(process.env), { timeout: 15000 }),
  });
}
export async function checkedClient() {
  const client = chainClient();
  assertMonad(await client.getChainId());
  return client;
}
export function configuredOwner() {
  return address(process.env, "CONFIANCE_OWNER");
}
export function publicResponse(value: unknown, status = 200) {
  return new Response(
    JSON.stringify(value, (_, v: unknown) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
