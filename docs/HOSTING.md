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

Import root `render.yaml` as a Blueprint. The preview uses the free plan and can
sleep; continuous observation requires upgrading to an always-on paid plan.
`npm run backend:start` supervises Next's API
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

For this preview, the user explicitly selected the existing localhost owner.
`OWNER_CONSOLE_URL=http://localhost:3050` makes the public app direct owner actions
to that console instead of requesting an unusable hosted-domain passkey. The
local console must be running for those owner actions. Agent observation and
payment execution run on Render independently of the owner console.

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
The hosted PR #2 rehearsal additionally proves task-discovery CRE delivery and
Render's autonomous Privy payment. See the independently checked receipts in
[DEPLOYMENTS.md](DEPLOYMENTS.md). Owner setup/signing used the localhost passkey;
this is not yet proof of owner authentication on the new Vercel hostname.

## Current hosting rollout

Vercel project: `confiance`, public domain `https://confiance-eta.vercel.app`.
Render service: `confiance-backend`, URL `https://confiance-backend.onrender.com`.
These are provisioned resources; check their actual deployment health before use.
Vercel Git linking was rejected because its account has no GitHub Login Connection.
The initial frontend uses a direct source upload. Connect GitHub in Vercel Settings
to enable future automatic Git deployments. Render uses the `dev` branch, with
automatic deploys disabled while the rollout is being checked.

Hosted Envio GraphQL: `https://indexer.dev.hyperindex.xyz/bce44db/v1/graphql`.
Its Monad testnet HyperSync ingestion was checked against both real payments.
The free Envio Development deployment has a maximum 30-day lifetime; Render's
free preview can sleep. These are preview hosting choices, not uptime guarantees.
Public evidence is in [envio-cloud.json](research/envio-cloud.json).
