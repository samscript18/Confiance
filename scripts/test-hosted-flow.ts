import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { database, closeStorage } from "../packages/shared/storage.js";
interface AuthDocument {
  _id: string;
  expires: number;
}
const fixture = privateKeyToAccount(`0x${"0".repeat(63)}1`);
const proxy = randomBytes(32).toString("hex");
const namespace = `proxy-validation-${randomUUID()}`;
const origin = "http://localhost:3031";
const base = {
  ...process.env,
  NODE_ENV: "production",
  CONFIANCE_PROJECT_ROOT: process.cwd(),
  CONFIANCE_STORAGE_NAMESPACE: namespace,
  CONFIANCE_OWNER: fixture.address,
  CONFIANCE_ADDRESS: "",
  PRIVY_APP_ID: "",
  PRIVY_APP_SECRET: "",
  PRIVY_AGENT_WALLET_ID: "",
  AGENT_ADDRESS: "",
  ERC8004_AGENT_ID: "",
  ERC8004_IDENTITY_REGISTRY: "",
  WEB_ORIGIN: origin,
  CONFIANCE_PROXY_SECRET: proxy,
};
function start(port: string, backend: string): ChildProcess {
  return spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "apps/web",
      "--hostname",
      "127.0.0.1",
      "--port",
      port,
    ],
    { env: { ...base, CONFIANCE_BACKEND_URL: backend }, stdio: "ignore" },
  );
}
async function ready(port: number) {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/app/overview`)).ok) return;
    } catch {
      /* Server booting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Local proxy validation server did not start.");
}
let backend = start("3030", "");
const frontend = start("3031", "http://localhost:3030");
try {
  if (!process.env.MONGODB_URI)
    throw new Error("MongoDB is required for restart validation.");
  await Promise.all([ready(3030), ready(3031)]);
  const forged = await fetch(`${origin}/api/auth?action=challenge`, {
    method: "POST",
    headers: { Origin: "https://attacker.example" },
  });
  assert.equal(forged.status, 403);
  const challenge = await fetch(`${origin}/api/auth?action=challenge`, {
    method: "POST",
    headers: { Origin: origin },
  });
  assert.equal(challenge.status, 200);
  const v = (await challenge.json()) as { id: string; message: string };
  const signature = await fixture.signMessage({ message: v.message });
  const input = { id: v.id, owner: fixture.address, signature };
  const login = await fetch(`${origin}/api/auth`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  assert.equal(login.status, 200);
  assert.equal(
    await (await database())
      .collection<AuthDocument>("owner_auth")
      .countDocuments({ _id: { $regex: `^${namespace}:session:` } }),
    1,
  );
  const cookie = login.headers.getSetCookie()[0]?.split(";")[0];
  assert.ok(cookie);
  assert.ok(login.headers.getSetCookie()[0]?.includes("HttpOnly"));
  const replay = await fetch(`${origin}/api/auth`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  assert.equal(replay.status, 401);
  const tasks = await fetch(`${origin}/api/task`);
  assert.deepEqual(await tasks.json(), { tasks: [] });
  backend.kill("SIGTERM");
  await new Promise((resolve) => backend.once("exit", resolve));
  backend = start("3030", "");
  await ready(3030);
  // A malformed task is rejected after authentication. It never reaches a signer.
  const rejected = await fetch(`${origin}/api/task`, {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "monitor", enabled: true }),
  });
  assert.equal(rejected.status, 409);
  const logout = await fetch(`${origin}/api/auth?action=logout`, {
    method: "POST",
    headers: { Origin: origin, Cookie: cookie },
  });
  assert.equal(logout.status, 200);
  const db = await database();
  assert.equal(
    await db
      .collection<AuthDocument>("owner_auth")
      .countDocuments({ _id: { $regex: `^${namespace}:session:` } }),
    0,
  );
  assert.equal(
    await db
      .collection<AuthDocument>("owner_auth")
      .countDocuments({ _id: { $regex: `^${namespace}:challenge:` } }),
    0,
  );
  console.log(
    "Hosted split integration PASS: two-server proxy, origin rejection, signed owner auth, HttpOnly cookie forwarding, challenge replay rejection, task discovery, backend restart, logout persistence and invalid-task rejection. Unfunded fixture; no blockchain writes.",
  );
} catch {
  console.error("Hosted split integration failed. No payment was attempted.");
  process.exitCode = 1;
} finally {
  frontend.kill("SIGTERM");
  backend.kill("SIGTERM");
  await (await database())
    .collection<AuthDocument>("owner_auth")
    .deleteMany({ _id: { $regex: `^${namespace}:` } });
  await closeStorage();
}
