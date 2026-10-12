import {
  consensusIdenticalAggregation,
  cre,
  decodeJson,
  encodeCallMsg,
  json,
  ok,
  prepareReportRequest,
  Runner,
  TxStatus,
  type Runtime,
  type NodeRuntime,
} from "@chainlink/cre-sdk/unrestricted";
import {
  bytesToHex,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbi,
  stringToHex,
} from "viem";
import {
  parseConfig,
  parseEvidence,
  type Config,
  type MergeEvidence,
} from "./config.js";

// Published SDK selector is routing metadata; tenant write support must still be confirmed.
const selector =
  cre.capabilities.EVMClient.SUPPORTED_CHAIN_SELECTORS["monad-testnet"];
const receiverAbi = parseAbi([
  "function verifiedConditions(bytes32) view returns (bool)",
]);
function fetchMilestone(runtime: NodeRuntime<Config>): MergeEvidence {
  const response = new cre.capabilities.HTTPClient()
    .sendRequest(runtime, {
      url: `https://api.github.com/repos/${runtime.config.repo}/pulls/${runtime.config.pr}`,
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
      },
      cacheSettings: { store: true, maxAge: "30s" },
    })
    .result();
  if (!ok(response))
    throw new Error(
      "GitHub verification failed; no condition report generated.",
    );
  return parseEvidence(json(response), runtime.config.repo, runtime.config.pr);
}
function verifyMilestone(runtime: Runtime<Config>): Record<string, string> {
  const config = runtime.config;
  const milestone = runtime
    .runInNodeMode(
      fetchMilestone,
      consensusIdenticalAggregation<MergeEvidence>(),
    )()
    .result();
  if (!milestone.merged) {
    runtime.log(
      `GitHub PR state: ${milestone.state}; no condition report generated.`,
    );
    return { status: "waiting", state: milestone.state };
  }
  const condition = keccak256(
    stringToHex(`github:${config.repo}:${config.pr}`),
  );
  const evm = new cre.capabilities.EVMClient(selector);
  const prior = evm
    .callContract(runtime, {
      call: encodeCallMsg({
        from: config.receiver,
        to: config.receiver,
        data: encodeFunctionData({
          abi: receiverAbi,
          functionName: "verifiedConditions",
          args: [condition],
        }),
      }),
    })
    .result();
  if (decodeAbiParameters([{ type: "bool" }], bytesToHex(prior.data))[0])
    return { status: "already_verified", condition };
  const evidence = keccak256(
    stringToHex(
      `${milestone.repo}:${milestone.number}:${milestone.commit}:${milestone.mergedAt}`,
    ),
  );
  const payload = encodeAbiParameters(
    [
      { type: "uint256" },
      { type: "address" },
      { type: "bytes32" },
      { type: "bytes32" },
    ],
    [10143n, config.receiver, condition, evidence],
  );
  const report = runtime.report(prepareReportRequest(payload)).result();
  const result = evm
    .writeReport(runtime, {
      receiver: config.receiver,
      report,
      gasConfig: { gasLimit: "200000" },
    })
    .result();
  // Receiver enum SUCCESS=0 in the installed SDK. A broadcast hash alone is not verification.
  if (
    result.txStatus !== TxStatus.SUCCESS ||
    result.receiverContractExecutionStatus !== 0 ||
    !result.txHash ||
    result.txHash.length !== 32
  )
    throw new Error("CRE delivery did not prove receiver execution.");
  runtime.log(`Condition report confirmed: ${bytesToHex(result.txHash)}`);
  return {
    status: "verified",
    condition,
    evidence,
    transactionHash: bytesToHex(result.txHash),
  };
}
export async function main() {
  const runner = await Runner.newRunner<Config>({
    configParser: (bytes) => parseConfig(decodeJson(bytes)),
  });
  await runner.run((config) => [
    cre.handler(
      new cre.capabilities.CronCapability().trigger({
        schedule: config.schedule,
      }),
      verifyMilestone,
    ),
  ]);
}
main();
