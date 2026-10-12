# Live setup and reproducible demo

Provider credentials and an owner address are configured locally. Confiance is
deployed, the Privy agent is funded and ERC-8004 identity 2210 is minted. The full
30 CTT autonomous payment, limit, replay and revocation flows are verified.
The new hosted task-discovery rehearsal remains pending. See [LIVE_PROGRESS.md](LIVE_PROGRESS.md) for current operations
and blockers; the instructions below describe the complete setup sequence.
Keep secrets in ignored `.env`, never in chat or source control.

The hosted preview is https://confiance-eta.vercel.app. Current local owner controls
use http://localhost:3050; set `WEB_ORIGIN` to the exact local origin when moving ports.
See [HOSTING.md](HOSTING.md) for MongoDB, Render/Vercel and terminal-free task setup.

For provider signup links, exact credential fields and tasks that require human
authentication, see [CREDENTIALS.md](CREDENTIALS.md). Current local setup checks
were refreshed on 2026-10-12; live operations still require the listed inputs.

## 1. Install and choose the owner domain

Use Node 24+, npm and Foundry 1.5.1 with Solidity 0.8.28:

```sh
npm ci
npm run contracts:build
npm run abi
cp .env.example .env
npm run dev
```

Open **http://localhost:3000**, then choose **Open app**. `WEB_ORIGIN` must match the browser origin exactly.
Use HTTPS when hosting. NEXT_PUBLIC_MONAD_RPC_URL is public browser configuration;
never place a private RPC API key there. Server credentials have no NEXT_PUBLIC prefix.

Mera passkeys are scoped to the hostname. Choose the intended domain before
funding an owner or deploying an immutable-owner account. Moving from localhost
to a different hostname does not recover the same passkey account automatically.
Supported authenticators need WebAuthn PRF. Chrome local-profile passkeys can
create successfully but fail to return PRF; use a supported Google Password
Manager, iCloud Keychain or 1Password combination and test it with the human.

In **Account**, choose **Create passkey** once. Copy the displayed public
owner address into CONFIANCE_OWNER in `.env`, restart the app, then use **Sign in**.
Returning visits should sign in, not create another passkey. Only credential
metadata is persisted. Keys stay in memory and the signing session expires after
ten minutes. Owner sign-in also signs a non-payment server authentication challenge.

## 2. Fund and deploy on Monad

Obtain testnet MON for the owner from the [Monad faucet](https://testnet.monad.xyz/).
The browser validates chain **10143** before signing. Choose **Deploy Confiance**.
Wait for the real receipt; copy the returned account address and transaction hash.

```sh
npm run record:deployment -- <actual Confiance creation transaction hash>
```

Set CONFIANCE_ADDRESS and CONFIANCE_DEPLOYMENT_BLOCK from that checked record,
then restart. The recorder verifies chain, receipt, compiled creation calldata,
code presence and configured owner, and writes docs/DEPLOYMENTS.md.

For the closest supported token proof, choose **Deploy & fund CTT test token**.
This mints 1,000 six-decimal CTT directly to Confiance. Set PAYMENT_ASSET to its
actual address. CTT is a test ERC-20, not USD or Cleanverse. For an existing exact
ERC-20, use **Transfer tokens to Confiance** from the owner instead. Native MON
funds owner/agent gas; Confiance receives ERC-20 tokens.

The encrypted Foundry keystore scripts remain available for a separate interim
core-contract proof. They are not Mera authentication:

```sh
cast wallet new ~/.foundry/keystores confiance-testnet
forge script contracts/script/Deploy.s.sol:Deploy --root contracts \
  --rpc-url https://testnet-rpc.monad.xyz \
  --account confiance-testnet --sender "$CONFIANCE_OWNER" --broadcast --slow
```

Use the positional keystore directory so no raw private key is printed. An
interim owner cannot later be replaced with a Mera owner in this immutable MVP.

## 3. Privy agent and ERC-8004 identity

Create an app in the [Privy dashboard](https://dashboard.privy.io), then set
PRIVY_APP_ID and PRIVY_APP_SECRET locally. Configure the documented server-wallet
signing authorization; PRIVY_AUTHORIZATION_KEY is optional when your app requires it.
Choose **Create / connect Privy wallet**, or run `npm run agent:wallet`.
The verified public wallet ID/address are saved in ignored deployments/agent-wallet.json
and shared by the CLI and web runtime. An explicit .env wallet ID takes precedence.
Fund the agent's distinct address with testnet MON.

Set ERC8004_IDENTITY_REGISTRY to the researched Monad testnet registry:
`0x8004A818BFB912233c491871b3d84c89A494BD9e`. Code presence and getVersion() =
2.0.0 were checked on chain 10143; the adapter checks the version again before minting.

Set ERC8004_AGENT_URI to a public HTTPS or IPFS registration JSON document.
Once the real agent wallet exists, `/api/identity` provides registration metadata
for that wallet. Export/host that document if running locally; a localhost URI
is not publicly retrievable. A hosted HTTPS app can use its `/api/identity` URL.
No publishing operation is performed automatically.

Choose **Register ERC-8004 identity**, or run `npm run agent:identity`.
The agent signs its own registry transaction. The adapter verifies the mint
receipt, wallet binding and sender/calldata, then saves public identity details
in ignored deployments/identity.json. The Confiance identity commitment binds
chain, registry and minted token ID. Identity is not spending authorization.

## 4. Configure the real payroll task

Set PAYMENT_RECIPIENT to the approved contractor and PAYMENT_AMOUNT=30 in exact
token units. Configure a real GITHUB_REPO=owner/repository and GITHUB_PR_NUMBER.
The example #42 must actually exist; no synthetic PR is supplied.
The current CRE workflow uses the public GitHub API. Private PR verification
needs a separately configured CRE secret integration; the agent's optional
GITHUB_TOKEN alone does not configure a DON secret.

Set an HTTPS LLM_BASE_URL, LLM_API_KEY and tool-capable LLM_MODEL for a provider
using the documented chat-completions function-tool protocol. Example API base:
`https://api.mistral.ai/v1`. No fallback model or unpaid mock response is used.

The current selected provider is Gemini on Vertex AI. Follow [VERTEX.md](VERTEX.md)
for `verith-ai` authentication. Vertex uses `LLM_PROVIDER=vertex`, project/location,
and Google OAuth credentials; `LLM_BASE_URL`/`LLM_API_KEY` belong only to the optional
chat-completions provider and are not sent to Vertex.

On `/app/agent#permissions`, enter the same token, contractor and GitHub task, a total
budget of 50 token units, and authorize the 24-hour session. Mera signs agent
registration/session setup. The contract enforces cumulative spending, nonce,
generation, expiry, asset, exact recipient and milestone itself.

The dashboard currently creates the real exact-recipient ERC-20 fallback policy
with no compliance adapter. It never labels that policy Cleanverse-enforced.
The owner-only Foundry session script can configure a separately verified adapter;
no official Cleanverse adapter ABI/enrollment path has yet been confirmed.

## 5. Chainlink CRE

Install/authenticate the CRE CLI. `cre workflow supported-chains --output json`
previously failed with a tenant-refresh 403. Authentication and real Monad
report delivery now work for this project. For a fresh setup, authenticate your
own account and confirm **Monad testnet production writes** and its actual
forwarder. A published chain selector is not tenant deployment authorization.

Only after that confirmation, set CRE_MONAD_TESTNET_WRITE_CONFIRMED=true:

```sh
npm run cre:configure
npm run cre:setup
npm run cre:build
```

The version-pinned Bun runtime compiles the SDK workflow to WASM. If npm skipped
Bun's installation hook, `cre:setup` installs its platform binary. Compilation
passes strict types and runtime compatibility validation; it proves no DON execution.
The workflow reaches identical consensus on matching repository/PR/merge evidence,
checks onchain condition state, generates a domain-bound report and writes via CRE.

Project configuration is in cre/project.yaml. Follow the authenticated CLI's
supported deployment procedure from that project directory:

```sh
cd cre
cre workflow simulate workflows/milestone --target staging-settings
cre workflow deploy workflows/milestone --target staging-settings
```

Supply MONAD_RPC_URL in the CLI environment (project RPC interpolation uses it).
A non-broadcast simulation is not live verification. Do not configure a simulator
forwarder as the production reporting authority. Actual deployment/activation
requires your CRE tenant access and the correct registry/signing configuration.

Set CHAINLINK_CRE_FORWARDER, CHAINLINK_CRE_WORKFLOW_ID and CHAINLINK_CRE_WORKFLOW_OWNER
from verified deployment metadata. On `/app/settings`, enter those same
values and choose **Authorize CRE reporter**. Mera signs that owner-only transaction.
There is no endpoint for marking a milestone verified.

## 6. Envio history

After recording a real Confiance deployment:

```sh
npm run indexer:configure
npm run indexer:start
```

The generator rechecks the deployment receipt and derives address, block and ABI.
Supply ENVIO_MONAD_RPC_URL to Envio's environment, or its ignored local environment
file as documented by Envio. Run Envio's documented local database setup or hosted
indexer deployment for your environment; local database services may require Docker.
Set ENVIO_GRAPHQL_URL to its actual GraphQL endpoint and restart the dashboard.

`npm run indexer:typecheck` uses a skipped, address-free configuration only to
produce/check types. It does not start indexing or prove Monad history. Production
uses the ignored deployment-derived indexer/config.yaml. Successful logs are indexed;
reverted receipts are checked and displayed separately because their events vanish.

## 7. Start autonomous observation and demonstrate authority

```sh
npm run preflight
npm run agent:watch
```

Preflight reports configuration names only. It continues to flag missing Cleanverse
configuration until that integration is genuinely available. The polling worker
runs an actual LLM every configured interval (default 120 seconds, minimum 60),
waits while the milestone is incomplete and can request payment once the real
CRE condition is onchain. Owner sign-in/signing is not part of this payment path.
For one cycle, use Run Payroll Agent in the dashboard or `npm run agent:run`.

On `/app/agent#test-permissions`, use **Attempt before verification** while the PR is open, merge
the real PR, wait for CRE delivery and watch the agent settle the authorized payment.
Then use **Attempt 500 tokens**, revoke with the owner and **Retry after revocation**.
These attack controls are deterministic diagnostics using the same Privy agent.
They submit only after the expected contract rejection is observed, verify reverted
receipts and display real explorer links. DIAGNOSTIC_RECIPIENT enables the wrong
address test, which proves the pinned recipient rule, not A-Pass enforcement.

CLI diagnostics remain available:

```sh
npm run agent:diagnostic -- 30 --submit
npm run agent:diagnostic -- 500 --submit
npm run agent:diagnostic -- 1 --replay --submit
```

Receipts are stored in ignored proofs/. Never call model prose a payment proof.
Pending transactions block another runtime cycle. Interrupted successful payments
require reviewing sender, target, calldata and event; interrupted payroll.lock files
must be removed only after establishing that no run/submission remains active.
Keep durable task receipts: deleting them removes the offchain duplicate-payment guard.

## 8. Cleanverse limitation

Update, 12 October: the supplied invitation opened the official docs and the developer
API ID successfully queried sandbox registration. The validator ABI and a contract-vault
route are now documented. An isolated adapter is implemented and tested, but no adapter
is deployed. See [CLEANVERSE.md](CLEANVERSE.md) for the exact enrollment and proof steps;
the earlier ABI-discovery limitation below has been superseded.

The official sandbox Monad addresses have deployed code, but Confiance enrollment,
smart-contract principals and the complete onchain eligibility ABI are unconfirmed.
No fake A-Pass checker or invented transfer adapter is installed. Obtain official
confirmation and then prove a direct compliant Confiance transfer to an eligible
recipient before enabling that claim. See INTEGRATIONS.md for the exact evidence.

The core payment, CRE, spending-limit, replay and same-key revocation proofs are
recorded. The current session is revoked; authorize a fresh session only for a
new intended task. Cleanverse compliant settlement remains outstanding. New task/session policies
must use the same exact milestone as the deployed CRE workflow.
