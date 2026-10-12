import { publicResponse } from "../../../lib/server";
import { database } from "../../../../../packages/shared/storage";
import { relayBackend } from "../../../lib/backend";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const relay = await relayBackend(request);
  if (relay) return relay;
  try {
    await (await database()).command({ ping: 1 });
    return publicResponse({ status: "ready" });
  } catch {
    return publicResponse({ status: "storage_unavailable" }, 503);
  }
}
