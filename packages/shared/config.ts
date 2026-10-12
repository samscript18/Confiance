import { getAddress, isAddress, type Address } from "viem";
import { monadTestnet } from "./chain.js";

export const targetChain = monadTestnet;
export function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
export function address(env: NodeJS.ProcessEnv, name: string): Address {
  const value = required(env, name);
  if (!isAddress(value) || /^0x0{40}$/i.test(value))
    throw new Error(`Invalid address: ${name}`);
  return getAddress(value);
}
export function rpcUrl(env: NodeJS.ProcessEnv): string {
  const url = new URL(required(env, "MONAD_RPC_URL"));
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  ) {
    throw new Error("RPC must use HTTPS (HTTP only allowed on localhost).");
  }
  return url.toString();
}
export function assertMonad(chainId: number): void {
  if (chainId !== targetChain.id)
    throw new Error(
      `Wrong network: expected Monad Testnet (${targetChain.id}).`,
    );
}
export function json(value: unknown): string {
  return JSON.stringify(
    value,
    (_, item: unknown) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}
