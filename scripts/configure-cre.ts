import { mkdir, writeFile } from "node:fs/promises";
import { address, json, required } from "../packages/shared/config.js";
import { validGithubRepo } from "../packages/shared/github.js";
if (process.env.CRE_MONAD_TESTNET_WRITE_CONFIRMED !== "true")
  throw new Error(
    "Confirm actual Monad testnet production-write support and forwarder in the authenticated CRE directory first.",
  );
const repo = required(process.env, "GITHUB_REPO");
const pr = Number(required(process.env, "GITHUB_PR_NUMBER"));
if (!validGithubRepo(repo) || !Number.isSafeInteger(pr) || pr <= 0)
  throw new Error("Invalid GitHub milestone.");
const receiver = address(process.env, "CONFIANCE_ADDRESS");
await mkdir("cre/workflows/milestone", { recursive: true });
await writeFile(
  "cre/workflows/milestone/config.json",
  json({
    schedule: "0 */1 * * * *",
    repo,
    pr,
    receiver,
    productionWriteConfirmed: true,
  }),
);
console.log(
  "Workflow config prepared. Pin actual deployed workflow ID/owner/forwarder in Confiance before activation.",
);
