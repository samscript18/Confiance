import {
  getAddress,
  isAddress,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { validGithubRepo } from "../packages/shared/github.js";
import { dataPath, readRecord } from "../packages/shared/storage.js";
export interface PayrollJob {
  version: 1;
  account: Address;
  agent: Address;
  repo: string;
  pr: number;
  asset: Address;
  recipient: Address;
  amount: string;
  policyHash: Hex;
  condition: Hex;
  generation: string;
  savedAt: string;
}
export function parseJob(value: unknown): PayrollJob {
  if (!value || typeof value !== "object")
    throw new Error("Invalid payroll task.");
  const v = value as Record<string, unknown>;
  if (
    v.version !== 1 ||
    typeof v.repo !== "string" ||
    !validGithubRepo(v.repo) ||
    typeof v.pr !== "number" ||
    !Number.isSafeInteger(v.pr) ||
    v.pr <= 0 ||
    ![v.account, v.agent, v.asset, v.recipient].every(
      (x) => typeof x === "string" && isAddress(x) && !/^0x0{40}$/i.test(x),
    ) ||
    typeof v.amount !== "string" ||
    !/^\d+(\.\d+)?$/.test(v.amount) ||
    !/[1-9]/.test(v.amount) ||
    typeof v.policyHash !== "string" ||
    !/^0x[0-9a-f]{64}$/i.test(v.policyHash) ||
    typeof v.generation !== "string" ||
    !/^\d+$/.test(v.generation) ||
    typeof v.savedAt !== "string" ||
    v.condition !== keccak256(stringToHex(`github:${v.repo}:${v.pr}`))
  )
    throw new Error("Invalid payroll task.");
  return {
    version: 1,
    account: getAddress(v.account as string),
    agent: getAddress(v.agent as string),
    asset: getAddress(v.asset as string),
    recipient: getAddress(v.recipient as string),
    repo: v.repo,
    pr: v.pr,
    amount: v.amount,
    policyHash: v.policyHash as Hex,
    condition: v.condition as Hex,
    generation: v.generation,
    savedAt: v.savedAt,
  };
}
export async function readJob(env: NodeJS.ProcessEnv) {
  const value = await readRecord(dataPath(env, "payroll-task.json"));
  return value === undefined ? undefined : parseJob(value);
}
export interface Monitoring {
  enabled: boolean;
  updatedAt: string;
}
export async function readMonitoring(
  env: NodeJS.ProcessEnv,
): Promise<Monitoring> {
  const value = await readRecord(dataPath(env, "monitoring.json"));
  if (value === undefined) return { enabled: false, updatedAt: "" };
  if (
    !value ||
    typeof value !== "object" ||
    !("enabled" in value) ||
    typeof value.enabled !== "boolean" ||
    !("updatedAt" in value) ||
    typeof value.updatedAt !== "string"
  )
    throw new Error("Invalid monitoring configuration.");
  return { enabled: value.enabled, updatedAt: value.updatedAt };
}
