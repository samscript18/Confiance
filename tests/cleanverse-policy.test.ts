import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPublicClient,
  custom,
  decodeFunctionData,
  encodeFunctionResult,
  encodeAbiParameters,
  erc20Abi,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import {
  cleanverseAdapterAbi,
  readCleanversePolicy,
} from "../packages/shared/cleanverse-policy.js";

const account: Address = "0x1111111111111111111111111111111111111111";
const asset: Address = "0x2222222222222222222222222222222222222222";
const validator: Address = "0x3333333333333333333333333333333333333333";
const adapter: Address = "0x4444444444444444444444444444444444444444";
const recipient: Address = "0x5555555555555555555555555555555555555555";
const policy: Address = "0x6666666666666666666666666666666666666666";
function fixture(overrides: Record<string, Address | boolean> = {}) {
  const getters: Record<string, Address | boolean> = {
    account,
    asset,
    validator,
    policy,
    checkAssetEligibility: true,
    checkRecipientEligibility: false,
    ...overrides,
  };
  return createPublicClient({
    transport: custom({
      async request({ method, params }) {
        assert.equal(method, "eth_call");
        const [call] = params as [{ to: Address; data: Hex }];
        if (call.to.toLowerCase() === adapter) {
          const decoded = decodeFunctionData({
            abi: cleanverseAdapterAbi,
            data: call.data,
          });
          const result = getters[decoded.functionName];
          assert.notEqual(result, undefined);
          return typeof result === "boolean"
            ? encodeAbiParameters([{ type: "bool" }], [result])
            : encodeAbiParameters([{ type: "address" }], [result as Address]);
        }
        assert.equal(call.to.toLowerCase(), asset);
        const abi = [
          ...erc20Abi,
          ...parseAbi(["function policy() view returns (address)"]),
        ];
        const decoded = decodeFunctionData({ abi, data: call.data });
        switch (decoded.functionName) {
          case "policy":
            return encodeFunctionResult({
              abi,
              functionName: "policy",
              result: policy,
            });
          case "balanceOf":
            return encodeFunctionResult({
              abi,
              functionName: "balanceOf",
              result: 100000n,
            });
          case "decimals":
            return encodeFunctionResult({
              abi,
              functionName: "decimals",
              result: 6,
            });
          case "symbol":
            return encodeFunctionResult({
              abi,
              functionName: "symbol",
              result: "aUSDC",
            });
          default:
            throw new Error("Unexpected contract method");
        }
      },
    }),
  });
}
test("Cleanverse setup preserves a failing recipient check and exact token balance", async () => {
  const result = await readCleanversePolicy(
    fixture(),
    adapter,
    account,
    asset,
    validator,
    recipient,
  );
  assert.equal(result.treasuryEligible, true);
  assert.equal(result.recipientEligible, false);
  assert.equal(result.balance, "0.1");
});
for (const field of ["account", "asset", "validator", "policy"]) {
  test(`Cleanverse setup rejects an adapter bound to the wrong ${field}`, async () => {
    await assert.rejects(
      readCleanversePolicy(
        fixture({ [field]: recipient }),
        adapter,
        account,
        asset,
        validator,
        recipient,
      ),
      /does not match/,
    );
  });
}
