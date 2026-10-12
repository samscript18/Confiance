import { validGithubRepo } from "../../packages/shared/github.js";
export interface Milestone {
  merged: boolean;
  state: "open" | "closed";
  number: number;
  mergedAt: string | null;
  mergeCommit: string | null;
}
export function parseMilestone(value: unknown, expectedPr: number): Milestone {
  if (!value || typeof value !== "object")
    throw new Error("Invalid GitHub response.");
  const data = value as Record<string, unknown>;
  if (
    data.number !== expectedPr ||
    typeof data.merged !== "boolean" ||
    (data.state !== "open" && data.state !== "closed")
  )
    throw new Error("Invalid GitHub PR state.");
  if (
    data.merged &&
    (data.state !== "closed" ||
      typeof data.merged_at !== "string" ||
      typeof data.merge_commit_sha !== "string")
  )
    throw new Error("Incomplete merge evidence.");
  return {
    merged: data.merged,
    state: data.state,
    number: expectedPr,
    mergedAt: typeof data.merged_at === "string" ? data.merged_at : null,
    mergeCommit:
      typeof data.merge_commit_sha === "string" ? data.merge_commit_sha : null,
  };
}
export async function checkGithub(
  repo: string,
  pr: number,
  token?: string,
): Promise<Milestone> {
  if (!validGithubRepo(repo) || !Number.isSafeInteger(pr) || pr <= 0)
    throw new Error("Invalid GitHub milestone configuration.");
  const response = await fetch(
    `https://api.github.com/repos/${repo}/pulls/${pr}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error("GitHub milestone unavailable.");
  return parseMilestone(await response.json(), pr);
}
