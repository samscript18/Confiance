import { mkdir, writeFile } from "node:fs/promises";
import { confianceAbi } from "../packages/shared/contracts.js";
await mkdir("indexer/abis", { recursive: true });
await writeFile("indexer/abis/Confiance.json", JSON.stringify(confianceAbi));
console.log(
  "Indexer ABI prepared for code generation. No deployment address or live indexing is implied.",
);
