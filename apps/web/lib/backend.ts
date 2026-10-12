import "server-only";
import { timingSafeEqual } from "node:crypto";
export function validProxySecret(value: string | null): boolean {
  const expected = process.env.CONFIANCE_PROXY_SECRET;
  if (!expected || expected.length < 32 || !value) return false;
  const a = Buffer.from(value),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function relayBackend(
  request: Request,
): Promise<Response | undefined> {
  const base = process.env.CONFIANCE_BACKEND_URL;
  if (!base) return undefined;
  const url = new URL(base);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Invalid backend URL.");
  const source = new URL(request.url);
  if (
    request.method !== "GET" &&
    request.headers.get("origin") !== (process.env.WEB_ORIGIN || source.origin)
  )
    return Response.json({ error: "Origin rejected." }, { status: 403 });
  const secret = process.env.CONFIANCE_PROXY_SECRET;
  if (!secret || secret.length < 32)
    return Response.json(
      { error: "Backend connection is not configured." },
      { status: 503 },
    );
  const target = new URL(source.pathname + source.search, url);
  const headers = new Headers({ "x-confiance-proxy": secret });
  for (const key of ["cookie", "content-type", "origin"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  const response = await fetch(target, {
    method: request.method,
    headers,
    ...(request.method === "GET" ? {} : { body: await request.text() }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(290000),
  });
  const output = new Headers({
    "Content-Type": response.headers.get("content-type") || "application/json",
    "Cache-Control": "no-store",
  });
  for (const cookie of response.headers.getSetCookie())
    output.append("Set-Cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    headers: output,
  });
}
