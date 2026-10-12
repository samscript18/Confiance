import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { verifyMessage, isAddress, isHex, getAddress } from "viem";
import { checkedClient, configuredOwner } from "./server";
import { confianceAbi } from "../../../packages/shared/contracts";
import { address } from "../../../packages/shared/config";

type Challenge = { message: string; expires: number };
type Login = { owner: string; expires: number };
const state = globalThis as typeof globalThis & {
  confianceAuth?: {
    challenges: Map<string, Challenge>;
    sessions: Map<string, Login>;
  };
};
const auth = (state.confianceAuth ??= {
  challenges: new Map(),
  sessions: new Map(),
});
const cookieName = "confiance-owner";
export function sameOrigin(request: Request) {
  const expected = process.env.WEB_ORIGIN || "http://localhost:3000";
  if (
    request.headers.get("origin") !== expected ||
    new URL(request.url).origin !== expected
  )
    throw new Error("Origin rejected.");
}
export function challenge() {
  for (const [id, item] of auth.challenges)
    if (item.expires < Date.now()) auth.challenges.delete(id);
  if (auth.challenges.size >= 100)
    throw new Error("Too many pending challenges.");
  const id = randomBytes(32).toString("hex");
  const expires = Date.now() + 5 * 60 * 1000;
  const message = `Confiance owner sign-in\nOrigin: ${process.env.WEB_ORIGIN || "http://localhost:3000"}\nChain ID: 10143\nOwner: ${configuredOwner()}\nNonce: ${id}\nExpires: ${new Date(expires).toISOString()}\nThis authenticates dashboard access; it does not authorize a payment.`;
  auth.challenges.set(id, { message, expires });
  return { id, message };
}
export async function login(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    !("owner" in value) ||
    !("signature" in value)
  )
    throw new Error("Invalid sign-in.");
  const { id, owner, signature } = value;
  if (
    typeof id !== "string" ||
    typeof owner !== "string" ||
    !isAddress(owner) ||
    typeof signature !== "string" ||
    !isHex(signature)
  )
    throw new Error("Invalid sign-in.");
  const item = auth.challenges.get(id);
  auth.challenges.delete(id);
  if (
    !item ||
    item.expires < Date.now() ||
    getAddress(owner) !== configuredOwner() ||
    !(await verifyMessage({
      address: getAddress(owner),
      message: item.message,
      signature,
    }))
  )
    throw new Error("Owner authentication failed.");
  const token = randomBytes(32).toString("hex");
  for (const [key, item] of auth.sessions)
    if (item.expires < Date.now()) auth.sessions.delete(key);
  auth.sessions.set(token, {
    owner: getAddress(owner),
    expires: Date.now() + 60 * 60 * 1000,
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: (process.env.WEB_ORIGIN || "").startsWith("https:"),
    path: "/",
    maxAge: 3600,
  });
}
export async function requireOwner(request: Request) {
  sameOrigin(request);
  const token = (await cookies()).get(cookieName)?.value;
  const login = token ? auth.sessions.get(token) : undefined;
  if (!login || login.expires < Date.now() || login.owner !== configuredOwner())
    throw new Error("Sign in as the configured owner.");
  if (process.env.CONFIANCE_ADDRESS) {
    const client = await checkedClient();
    const owner = await client.readContract({
      address: address(process.env, "CONFIANCE_ADDRESS"),
      abi: confianceAbi,
      functionName: "owner",
    });
    if (owner.toLowerCase() !== login.owner.toLowerCase())
      throw new Error("Configured owner does not own Confiance.");
  }
  return login.owner;
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) auth.sessions.delete(token);
  jar.delete(cookieName);
}
