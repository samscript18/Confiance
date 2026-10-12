import { getAddress, isAddress, zeroAddress } from "viem";
import { validGithubRepo } from "../../../packages/shared/github.js";
export interface Config {
  schedule: string;
  repo: string;
  pr: number;
  receiver: `0x${string}`;
  productionWriteConfirmed: true;
}
export function parseConfig(value: unknown): Config {
  if (!value || typeof value !== "object")
    throw new Error("Invalid workflow config.");
  const data = value as Record<string, unknown>;
  if (
    typeof data.schedule !== "string" ||
    !data.schedule ||
    typeof data.repo !== "string" ||
    !validGithubRepo(data.repo) ||
    typeof data.pr !== "number" ||
    !Number.isSafeInteger(data.pr) ||
    data.pr <= 0 ||
    typeof data.receiver !== "string" ||
    !isAddress(data.receiver) ||
    data.receiver === zeroAddress ||
    data.productionWriteConfirmed !== true
  )
    throw new Error(
      "Real GitHub, receiver and confirmed Monad testnet production reporting path required.",
    );
  return {
    schedule: data.schedule,
    repo: data.repo,
    pr: data.pr,
    receiver: getAddress(data.receiver),
    productionWriteConfirmed: true,
  };
}
export interface MergeEvidence {
  merged: boolean;
  number: number;
  state: string;
  mergedAt: string;
  commit: string;
  repo: string;
}
export function parseEvidence(
  value: unknown,
  repo: string,
  pr: number,
): MergeEvidence {
  if (!value || typeof value !== "object")
    throw new Error("Invalid GitHub response.");
  const data = value as Record<string, unknown>;
  const base = data.base as { repo?: { full_name?: unknown } } | undefined;
  if (
    data.number !== pr ||
    typeof data.merged !== "boolean" ||
    (data.state !== "open" && data.state !== "closed") ||
    base?.repo?.full_name !== repo
  )
    throw new Error("GitHub response does not match the configured milestone.");
  if (
    data.merged &&
    (data.state !== "closed" ||
      typeof data.merged_at !== "string" ||
      Number.isNaN(Date.parse(data.merged_at)) ||
      typeof data.merge_commit_sha !== "string" ||
      !/^[0-9a-f]{40,64}$/i.test(data.merge_commit_sha))
  )
    throw new Error("Invalid merge evidence.");
  return {
    merged: data.merged,
    number: pr,
    state: data.state,
    mergedAt: typeof data.merged_at === "string" ? data.merged_at : "",
    commit:
      typeof data.merge_commit_sha === "string" ? data.merge_commit_sha : "",
    repo,
  };
}
