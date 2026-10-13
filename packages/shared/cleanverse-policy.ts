import {
  erc20Abi,
  formatUnits,
  parseAbi,
  type Address,
  type PublicClient,
} from "viem";

export const cleanverseAdapterAbi = parseAbi([
  "function account() view returns (address)",
  "function asset() view returns (address)",
  "function policy() view returns (address)",
  "function validator() view returns (address)",
  "function checkAssetEligibility(address) view returns (bool)",
  "function checkRecipientEligibility(address) view returns (bool)",
]);
export interface CleanversePolicySetup {
  adapter: Address;
  asset: Address;
  validator: Address;
  account: Address;
  recipient: Address;
  treasuryEligible: boolean;
  recipientEligible: boolean;
  balance: string;
  symbol: string;
}

// Revalidate live immutable bindings and eligibility, rather than trusting configuration.
export async function readCleanversePolicy(
  client: PublicClient,
  adapter: Address,
  account: Address,
  asset: Address,
  validator: Address,
  recipient: Address,
): Promise<CleanversePolicySetup> {
  const [boundAccount, boundAsset, boundValidator, boundPolicy] =
    await Promise.all(
      (["account", "asset", "validator", "policy"] as const).map(
        (functionName) =>
          client.readContract({
            address: adapter,
            abi: cleanverseAdapterAbi,
            functionName,
          }),
      ),
    );
  const actualPolicy = await client.readContract({
    address: asset,
    abi: parseAbi(["function policy() view returns (address)"]),
    functionName: "policy",
  });
  if (
    boundAccount?.toLowerCase() !== account.toLowerCase() ||
    boundAsset?.toLowerCase() !== asset.toLowerCase() ||
    boundValidator?.toLowerCase() !== validator.toLowerCase() ||
    boundPolicy?.toLowerCase() !== actualPolicy.toLowerCase()
  )
    throw new Error(
      "The compliance adapter does not match this account and asset.",
    );
  const [treasuryEligible, recipientEligible, balance, decimals, symbol] =
    await Promise.all([
      client.readContract({
        address: adapter,
        abi: cleanverseAdapterAbi,
        functionName: "checkAssetEligibility",
        args: [asset],
      }),
      client.readContract({
        address: adapter,
        abi: cleanverseAdapterAbi,
        functionName: "checkRecipientEligibility",
        args: [recipient],
      }),
      client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account],
      }),
      client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "decimals",
      }),
      client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "symbol",
      }),
    ]);
  return {
    adapter,
    asset,
    validator,
    account,
    recipient,
    treasuryEligible,
    recipientEligible,
    balance: formatUnits(balance, decimals),
    symbol,
  };
}
