import { readFile, writeFile } from "node:fs/promises";
// Declaration-only repairs. No runtime code, skipLibCheck, or weakened application types.
async function version(name, expected) {
  const data = JSON.parse(
    await readFile(`node_modules/${name}/package.json`, "utf8"),
  );
  if (data.version !== expected)
    throw new Error(`Review declaration repair for ${name} ${data.version}.`);
}
await version("envio", "3.14.0");
const envioPath = "node_modules/envio/index.d.ts";
let envio = await readFile(envioPath, "utf8");
if (!envio.includes("// Confiance declaration repair")) {
  envio = envio.replace(
    /NonNullable<\s*(EvmListedArray<Fields, Knob>|SvmListedArray<Fields, Knob>)\s*>\[number\]/g,
    "Extract<NonNullable<$1>, readonly unknown[]>[number]",
  );
  for (const kind of ["Evm", "Fuel"])
    envio = envio.replaceAll(
      `${kind}EventFilters<Config>[C]`,
      `${kind}EventFilters<Config>[C & keyof ${kind}EventFilters<Config>]`,
    );
  envio = envio.replaceAll(
    "EvmOnEventHandler<EvmEventWithFields<Contracts[C][E], F>,",
    "EvmOnEventHandler<EvmEventWithFields<Contracts[C][E], F> & EventLike,",
  );
  envio = envio.replaceAll(
    "EvmContractRegisterHandler<EvmEventWithFields<Contracts[C][E], F>,",
    "EvmContractRegisterHandler<EvmEventWithFields<Contracts[C][E], F> & EventLike,",
  );
  envio =
    "// Confiance declaration repair: constrain indexed generic arrays/keys and retain mandatory event names.\n" +
    envio;
}
await writeFile(envioPath, envio);
console.log(
  "Applied version-checked Envio declaration repair (runtime unchanged).",
);
