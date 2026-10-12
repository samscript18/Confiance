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
  getAddress,
  isAddress,
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
import { validGithubRepo } from "../../../packages/shared/github.js";

// Published SDK selector is routing metadata; tenant write support must still be confirmed.
const selector =
  cre.capabilities.EVMClient.SUPPORTED_CHAIN_SELECTORS["monad-testnet"];
const receiverAbi = parseAbi([
  "function verifiedConditions(bytes32) view returns (bool)",
  "function getSession(address) view returns ((bool exists,bool active,uint256 generation,uint256 spent,(address allowedAsset,address allowedRecipient,uint256 spendingLimit,uint256 expiry,address complianceAdapter,bytes32 requiredCondition) policy))",
]);
function fetchMilestone(
  runtime: NodeRuntime<Config>,
  repo: string,
  pr: number,
): MergeEvidence {
  const response = new cre.capabilities.HTTPClient()
    .sendRequest(runtime, {
      url: `https://api.github.com/repos/${repo}/pulls/${pr}`,
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
  return parseEvidence(json(response), repo, pr);
}
interface Task {
  repo: string;
  pr: number;
  agent?: `0x${string}`;
}
function fetchTasks(runtime: NodeRuntime<Config>): Task[] {
  if (!runtime.config.tasksUrl) return [];
  const response = new cre.capabilities.HTTPClient()
    .sendRequest(runtime, {
      url: runtime.config.tasksUrl,
      method: "GET",
      cacheSettings: { store: true, maxAge: "30s" },
    })
    .result();
  if (!ok(response)) throw new Error("Task discovery unavailable.");
  const value: unknown = json(response);
  if (
    !value ||
    typeof value !== "object" ||
    !("tasks" in value) ||
    !Array.isArray(value.tasks) ||
    value.tasks.length > 1
  )
    throw new Error("Invalid task discovery.");
  return value.tasks.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid task.");
    const t = item as Record<string, unknown>;
    if (
      typeof t.receiver !== "string" ||
      getAddress(t.receiver) !== runtime.config.receiver ||
      typeof t.agent !== "string" ||
      !isAddress(t.agent) ||
      typeof t.repo !== "string" ||
      !validGithubRepo(t.repo) ||
      typeof t.pr !== "number" ||
      !Number.isSafeInteger(t.pr) ||
      t.pr <= 0 ||
      t.condition !== keccak256(stringToHex(`github:${t.repo}:${t.pr}`))
    )
      throw new Error("Invalid task.");
    return { repo: t.repo, pr: t.pr, agent: getAddress(t.agent) };
  });
}
function verifyMilestone(runtime: Runtime<Config>): Record<string, string> {
  const config = runtime.config;
  const tasks = config.tasksUrl
    ? runtime
        .runInNodeMode(fetchTasks, consensusIdenticalAggregation<Task[]>())()
        .result()
    : [{ repo: config.repo, pr: config.pr }];
  if (tasks.length === 0) return { status: "no_task" };
  const task: Task = tasks[0]!;
  const repo = task.repo,
    pr = task.pr;
  const condition = keccak256(stringToHex(`github:${repo}:${pr}`));
  if (task.agent) {
    const evm = new cre.capabilities.EVMClient(selector);
    const result = evm
      .callContract(runtime, {
        call: encodeCallMsg({
          from: config.receiver,
          to: config.receiver,
          data: encodeFunctionData({
            abi: receiverAbi,
            functionName: "getSession",
            args: [task.agent],
          }),
        }),
      })
      .result();
    const session = decodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "exists", type: "bool" },
            { name: "active", type: "bool" },
            { name: "generation", type: "uint256" },
            { name: "spent", type: "uint256" },
            {
              name: "policy",
              type: "tuple",
              components: [
                { name: "allowedAsset", type: "address" },
                { name: "allowedRecipient", type: "address" },
                { name: "spendingLimit", type: "uint256" },
                { name: "expiry", type: "uint256" },
                { name: "complianceAdapter", type: "address" },
                { name: "requiredCondition", type: "bytes32" },
              ],
            },
          ],
        },
      ],
      bytesToHex(result.data),
    )[0];
    if (
      !session.exists ||
      !session.active ||
      session.policy.requiredCondition !== condition
    )
      return { status: "task_not_authorized" };
  }
  const milestone = runtime
    .runInNodeMode(
      (nodeRuntime) => fetchMilestone(nodeRuntime, repo, pr),
      consensusIdenticalAggregation<MergeEvidence>(),
    )()
    .result();
  if (!milestone.merged) {
    runtime.log(
      `GitHub PR state: ${milestone.state}; no condition report generated.`,
    );
    return { status: "waiting", state: milestone.state };
  }
  runtime.log("GitHub merge verified. Reading the onchain condition.");
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
  runtime.log(
    "Condition report prepared. Submitting through the authorized forwarder.",
  );
  const result = evm
    .writeReport(runtime, {
      receiver: config.receiver,
      report,
      gasConfig: { gasLimit: "500000" },
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
