import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
if (process.env.CONFIANCE_BACKEND_URL)
  throw new Error("Backend must not proxy to itself.");
const env = {
  ...process.env,
  NODE_ENV: "production",
  CONFIANCE_PROJECT_ROOT: root,
};
const children = [
  spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "apps/web",
      "--hostname",
      "0.0.0.0",
      "--port",
      process.env.PORT || "3000",
    ],
    { cwd: root, env, stdio: "inherit" },
  ),
  spawn(process.execPath, ["--import", "tsx", "agent/runtime/worker.ts"], {
    cwd: root,
    env,
    stdio: "inherit",
  }),
];
// Resolve hoisted Next installation without relying on a workspace symlink.
for (const child of children) child.on("error", () => stop(1));
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 1000);
}
for (const child of children)
  child.on("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
