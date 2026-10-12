# Hosted payroll and local operation

This is a single-owner MVP: one configured Confiance account and one Privy signer
per storage namespace. MongoDB stores public wallet/identity records, payroll task,
monitoring state, owner-auth challenges/sessions, payment intents and proofs. It is
not an authorization oracle. The contract remains the authority for funds.

## Local

Configure the backend credentials once in ignored `.env`, including `MONGODB_URI`
and `MONGODB_DB`. Existing users run `npm run storage:migrate` once to preserve paid
task proofs and public signer/identity records. Do not delete those receipts.
Run `npm run dev` and `npm run agent:worker` for local development. Alternatively,
`npm run build` then `npm run backend:start` starts the production web/API and its
supervised worker together. Use localhost for your existing passkey.

In Agent, enter token, recipient, payment amount, GitHub repository/PR and total
budget. Approve the policy once; the confirmed policy receipt is checked before
task metadata is stored. Start monitoring. Merge the real PR. CRE must report the
exact condition before the agent can pay. Pause monitoring stops future observation
cycles, not a submitted transaction. Revoke to remove actual financial authority.
No end-user terminal command or environment edit is needed for a new payroll task.

## Render backend

Import root `render.yaml` as a Blueprint. The service uses a paid always-on plan;
review its cost before creating it. `npm run backend:start` supervises Next's API
server and the polling worker; if either exits, the service exits for restart.
MongoDB removes the need for a persistent Render disk. Never scale this deployment
without preserving its namespace and testing recovery. MongoDB execution leases
and task intents provide shared coordination, but this MVP runs one worker.

Set the backend's provider secrets, MongoDB URI/database/namespace, configured
owner/account and public registry configuration in Render's environment settings.
Set `WEB_ORIGIN` to the exact Vercel/custom-domain origin. Keep
`CONFIANCE_BACKEND_URL` empty here. Create a random `CONFIANCE_PROXY_SECRET` of at
least 32 characters and set the same secret on Vercel. Health is `/api/health`.
Do not copy the localhost namespace into a different owner's hosted deployment.

## Vercel frontend

Import the repository using `apps/web` as the project root and allow access to
files outside that root. The checked-in `vercel.json` builds from the monorepo.
Set `CONFIANCE_BACKEND_URL` to the actual Render HTTPS origin, the shared proxy
secret and exact `WEB_ORIGIN`. Set only a public RPC as
`NEXT_PUBLIC_MONAD_RPC_URL`. Privy, Vertex, MongoDB and Cleanverse secrets stay on
Render; do not put them in frontend/public variables.

The browser calls its same-origin `/api` routes. Vercel relays cookies and origin
with a server-only proxy credential to Render. Render checks both the origin and
owner session; the proxy secret cannot authorize a payment or mark a condition.
MongoDB stores hashed session tokens and consumes login challenges atomically.
Restarting Render does not invalidate a persisted owner session before its expiry.

Passkeys are scoped to the hostname. An existing localhost passkey is not assumed
to derive the same owner on a new domain. For the hosted owner, complete owner
onboarding on that final domain and configure/deploy its matching immutable-owner
account. This MVP is not a multi-tenant wallet platform; initial provider/owner
configuration remains an operator responsibility.

## One-time CRE activation

Set `CRE_TASKS_URL` to the Render service's public `/api/task` HTTPS endpoint,
then configure/build/deploy CRE once and approve its actual workflow identity with
the owner. New payroll tasks do not require further workflow redeployments.
The task endpoint exposes metadata only. CRE reaches consensus on the metadata,
checks its receiver/agent/condition against the actual onchain session, fetches the
actual GitHub merge evidence independently, and uses its authorized reporting path.
The endpoint never sets verification. Do not use localhost as a DON-reachable URL.
For local operation, the web/worker can use localhost while CRE reads the same
namespace from an operator-managed public HTTPS backend or tunnel. Provider
credentials must stay server-side regardless of that public endpoint.

## Recovery and verification

A durable task intent precedes payment submission. Recovery uses the exact Privy
idempotency key and calldata, then checks the actual receipt/events. It never creates
a fresh nonce to replace an uncertain payment. Pending, mismatched and externally
interrupted proofs fail closed. Database availability is required for execution;
a hosted backend never silently falls back to an ephemeral filesystem.

Run `npm run test:mongo` for isolated live database tests and `npm run test:hosted`
for the local two-server proxy/authentication/restart test. These tests cannot make
a real payment. Run unit, contract and browser tests separately. Hosted URLs and
task-discovery CRE delivery still require a live deployment rehearsal; compilation
and a local proxy test do not constitute that proof.
