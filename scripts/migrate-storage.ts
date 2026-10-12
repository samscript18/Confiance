import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  insertRecord,
  mongoConfigured,
  database,
} from "../packages/shared/storage.js";
if (!mongoConfigured()) throw new Error("Configure MongoDB before migration.");
const root = process.env.CONFIANCE_PROJECT_ROOT || process.cwd();
let copied = 0;
for (const folder of ["deployments", "proofs"]) {
  const path = join(root, folder);
  for (const name of await readdir(path).catch(() => [])) {
    if (!name.endsWith(".json") || /lease|lock/.test(name)) continue;
    const value: unknown = JSON.parse(await readFile(join(path, name), "utf8"));
    if (await insertRecord(join(path, name), value)) copied++;
  }
}
await (await database()).command({ ping: 1 });
console.log(
  `Storage migration verified: ${copied} public configuration/proof records added; existing database records preserved.`,
);
process.exit(0);
