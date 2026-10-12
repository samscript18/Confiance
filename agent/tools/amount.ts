import { parseUnits } from "viem";
export function parseExactAmount(value: string, decimals: number): bigint {
  if (
    !/^\d+(\.\d+)?$/.test(value) ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 36 ||
    (value.split(".")[1]?.length ?? 0) > decimals
  )
    throw new Error("Invalid token amount or precision.");
  const amount = parseUnits(value, decimals);
  if (amount <= 0n) throw new Error("Payment amount must be positive.");
  return amount;
}
