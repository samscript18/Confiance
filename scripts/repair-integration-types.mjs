import { readFile, writeFile } from "node:fs/promises";
// Declaration-only repairs. No runtime code, skipLibCheck, or weakened application types.
async function version(name, expected) {
  const data = JSON.parse(
    await readFile(`node_modules/${name}/package.json`, "utf8"),
  );
  if (data.version !== expected)
    throw new Error(`Review declaration repair for ${name} ${data.version}.`);
}
await version("@chainlink/cre-sdk", "1.23.0");
const crePath = "node_modules/@chainlink/cre-sdk/dist/sdk/types/global.d.ts";
let cre = await readFile(crePath, "utf8");
const circular =
  "type ExistingGlobal<K extends PropertyKey, Fallback> =\n\ttypeof globalThis extends Record<K, infer T> ? T : Fallback";
const fixed = `// Confiance declaration repair: use the existing DOM/Node globals explicitly,
// avoiding a circular lookup through the globals this same file redeclares.
type ExistingGlobal<K extends PropertyKey, Fallback> =
  K extends 'console' ? Console :
  K extends 'TextEncoder' ? {prototype: TextEncoder; new(): TextEncoder} :
  K extends 'TextDecoder' ? {prototype: TextDecoder; new(label?: string, options?: TextDecoderOptions): TextDecoder} :
  K extends 'Buffer' ? BufferConstructor :
  K extends 'URLSearchParams' ? {new(init?:string|Record<string,string>|URLSearchParams|string[][]):URLSearchParams;prototype:URLSearchParams} :
  K extends 'URL' ? {new(url:string|URL,base?:string|URL):URL;prototype:URL;canParse(url:string|URL,base?:string|URL):boolean;createObjectURL(obj:Blob|MediaSource):string;parse(url:string|URL,base?:string|URL):URL|null;revokeObjectURL(url:string):void} : Fallback`;
if (cre.includes(circular)) cre = cre.replace(circular, fixed);
else if (cre.includes("Confiance declaration repair"))
  cre = cre.replace(
    /\/\/ Confiance declaration repair[\s\S]*?Fallback(?=\n)/,
    fixed,
  );
else throw new Error("CRE global declarations changed.");
cre = cre.replace(
  "interface CreBuffer extends Uint8Array {",
  "interface CreBuffer extends Uint8Array<ArrayBuffer> {",
);
await writeFile(crePath, cre);
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
  "Applied version-checked CRE/Envio declaration repairs (runtime unchanged).",
);
