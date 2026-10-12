import { mkdir, open, readFile, rename } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { MongoClient, MongoServerError } from "mongodb";
import { readdir, unlink } from "node:fs/promises";
type RecordDocument = { _id: string; value: unknown };
const clients = new Map<string, MongoClient>();
export async function closeStorage() {
  await Promise.all([...clients.values()].map((client) => client.close()));
  clients.clear();
}
export function mongoConfigured() {
  return Boolean(process.env.MONGODB_URI);
}
export async function database() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MongoDB is not configured.");
  let client = clients.get(uri);
  if (!client) {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    clients.set(uri, client);
  }
  return client.db(process.env.MONGODB_DB || undefined);
}
function recordKey(path: string) {
  const root = process.env.CONFIANCE_PROJECT_ROOT || process.cwd();
  const name = relative(root, path).replaceAll("\\", "/");
  if (name.startsWith(".."))
    throw new Error("Storage path must belong to this app.");
  return `${process.env.CONFIANCE_STORAGE_NAMESPACE || "confiance-local"}:${name}`;
}
function assertFileMode() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.CONFIANCE_ALLOW_FILE_STORAGE !== "true"
  )
    throw new Error("Hosted backend requires MongoDB.");
}
export function dataPath(env: NodeJS.ProcessEnv, name: string) {
  return join(env.CONFIANCE_PROJECT_ROOT || process.cwd(), "deployments", name);
}
export async function readRecord(path: string): Promise<unknown> {
  if (mongoConfigured())
    return (
      await (await database())
        .collection<RecordDocument>("records")
        .findOne({ _id: recordKey(path) })
    )?.value;
  assertFileMode();
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return undefined;
    throw error;
  }
}
export async function writeRecord(path: string, value: unknown) {
  if (mongoConfigured()) {
    const serialized: unknown = JSON.parse(
      JSON.stringify(value, (_, v: unknown) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
    await (await database())
      .collection<RecordDocument>("records")
      .updateOne(
        { _id: recordKey(path) },
        { $set: { value: serialized } },
        { upsert: true },
      );
    return;
  }
  assertFileMode();
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  const file = await open(temporary, "wx", 0o600);
  try {
    await file.writeFile(
      JSON.stringify(value, (_, v: unknown) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temporary, path);
  const folder = await open(dirname(path), "r");
  try {
    await folder.sync();
  } finally {
    await folder.close();
  }
}
export async function insertRecord(
  path: string,
  value: unknown,
): Promise<boolean> {
  if (mongoConfigured()) {
    try {
      const result = await (await database())
        .collection<RecordDocument>("records")
        .updateOne(
          { _id: recordKey(path) },
          {
            $setOnInsert: {
              value: JSON.parse(
                JSON.stringify(value, (_, v: unknown) =>
                  typeof v === "bigint" ? v.toString() : v,
                ),
              ),
            },
          },
          { upsert: true },
        );
      return result.upsertedCount === 1;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000)
        return false;
      throw error;
    }
  }
  assertFileMode();
  await mkdir(dirname(path), { recursive: true });
  const file = await open(path, "wx").catch((error) => {
    if (error.code === "EEXIST") return undefined;
    throw error;
  });
  if (!file) return false;
  try {
    await file.writeFile(
      JSON.stringify(value, (_, v: unknown) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
    await file.sync();
  } finally {
    await file.close();
  }
  return true;
}
export async function removeRecord(path: string) {
  if (mongoConfigured()) {
    await (await database())
      .collection<RecordDocument>("records")
      .deleteOne({ _id: recordKey(path) });
    return;
  }
  assertFileMode();
  await unlink(path).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}
export async function recordNames(folder: string): Promise<string[]> {
  if (!mongoConfigured()) {
    assertFileMode();
    return readdir(folder).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
  }
  const prefix = `${recordKey(folder)}/`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const records = await (
    await database()
  )
    .collection<RecordDocument>("records")
    .find({ _id: { $regex: `^${escaped}` } }, { projection: { _id: 1 } })
    .toArray();
  return records
    .map((v) => v._id.slice(prefix.length))
    .filter((v) => !v.includes("/"));
}
