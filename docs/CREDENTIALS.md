# Credentials and next actions

Checked 2026-10-12. Secret values were not printed. The local `.env` is preserved,
restricted to owner read/write, and now includes the live-verified public ERC-8004
registry. No Confiance deployment or project identity exists yet.

Later in this setup session, Privy wallet creation and metadata publication succeeded,
and CRE login/deploy access became available. Current results supersede the initial
credential checklist below; see [LIVE_PROGRESS.md](LIVE_PROGRESS.md).

## What is ready

- Monad public RPC: chain 10143 verified.
- ERC-8004 registry: deployed code and version 2.0.0 verified; public address configured.
- Contract ABI/bytecode regenerated; strict application, CRE and indexer types checked.
- Local dashboard responds successfully at http://localhost:3000.
- Docker started; Envio Postgres and healthy Hasura containers are running.
- Refreshed checks: 49 contract tests (512 fuzz runs), 14 runtime tests, local signed
  payment/rejection proof, CRE WASM compilation and formatting all pass.
- Owner passkey, agent signer, identity mint, workflow and history code are implemented.

## 1. Human owner — no API credential required

Open http://localhost:3000 and choose **Account & policy → Create passkey**.
Complete the human authenticator prompt. Put the displayed public address in
`CONFIANCE_OWNER`, then restart and sign in. Recover the same address before funding.
Use this same hostname throughout; the deployed owner is immutable.

Get testnet MON at https://testnet.monad.xyz/ using that owner address. Faucet
login/anti-bot requirements must be completed by the human. Then **Deploy Confiance**
and give the actual public deployment hash to the engineer for receipt recording.
No seed phrase or private key is needed in `.env`.

## 2. Privy — application credentials

Dashboard: https://dashboard.privy.io
Official setup: https://docs.privy.io/basics/nodeJS/setup

1. Sign in and create/select a Confiance app.
2. Find its app ID and app secret in application settings.
3. Put them in `PRIVY_APP_ID` and `PRIVY_APP_SECRET` in local `.env`.
4. If the app's server-wallet authorization requires an authorization key, configure
   the documented signer and set `PRIVY_AUTHORIZATION_KEY`. Do not invent one.
5. Tell the engineer only that configuration is ready.

The engineer can then run `npm run agent:wallet`, verify the separate agent address,
prepare metadata and mint identity after its testnet gas funding. The public wallet
ID is saved automatically; do not copy wallet private keys.

## 3. LLM — choose a tool-capable model provider

One supported option is Mistral: https://console.mistral.ai/
Key creation instructions:
https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key

1. Sign up/sign in to Studio.
2. Open **API Keys → Create new key** and name it Confiance.
3. Copy the key once into `LLM_API_KEY` locally.
4. Set `LLM_BASE_URL=https://api.mistral.ai/v1`.
5. Set `LLM_MODEL` to a model available to your account with function-tool support.
   The engineer can inspect your provider's model list after the key is configured.

Use your existing provider instead if preferred: configure its HTTPS API base,
key and model. The runtime requires the chat-completions function-tool protocol.
Model calls may use your provider allowance or incur charges.

## 4. GitHub — actual milestone, public PR preferred

Create a repository: https://github.com/new

Create a public repository or select one you control, push a branch and open an
actual PR. Leave it open for the first blocked-payment scene. Set `GITHUB_REPO`
to owner/repository and `GITHUB_PR_NUMBER` to its actual number.

No GitHub token is required for the public API path at normal unauthenticated
limits. `GITHUB_TOKEN` is optional for the agent; it does not provision CRE secrets.
Set `PAYMENT_RECIPIENT` to the contractor's public address and optionally
`DIAGNOSTIC_RECIPIENT` to a different public address for the rejection test.

## 5. Chainlink CRE — human login and deployment access

Platform: https://app.chain.link/cre/discover
Deployment instructions:
https://docs.chain.link/cre/guides/operations/deploying-workflows

The existing local login refresh returns **403 Forbidden**. Complete:

```sh
cre login
cre whoami
cre account access
cre workflow supported-chains --output json
```

Deployment requires Chainlink approval. Confirm **Monad testnet production writes**
and its actual production forwarder with your tenant/Chainlink; simulation support
is insufficient. Leave `CRE_MONAD_TESTNET_WRITE_CONFIRMED=false` until confirmed.

The workflow ID, owner and forwarder are deployment results, not credentials you
can invent. The engineer can configure, compile and deploy the real workflow after
access, chain support, receiver deployment and GitHub task are available. The owner
must authorize the resulting reporter onchain.

## 6. Envio — no provider key needed for local history

Docker and local Postgres/Hasura containers have been started. Hasura is healthy
on http://localhost:8080; Postgres is exposed on local port 5433. This is service
preparation, not blockchain indexing. Schema migration with the type-only config
was attempted and refused because all chains are skipped; no Activity GraphQL
table is exposed yet. The actual deployment-derived configuration is required
before migration/indexing proceeds. No fake contract address was supplied.

After deployment, the engineer can generate live configuration, codegen, migrate
the database and start indexing. Only after a successful Activity query should
`ENVIO_GRAPHQL_URL` be set to http://localhost:8080/v1/graphql for local operation.

Hosted service information: https://docs.envio.dev/

## 7. Cleanverse — technical confirmation, not merely an API key

Official site: https://cleanverse.com/
Official developer references: https://github.com/cleanverseorg/clevrpay

Ask for Monad testnet smart-contract principal enrollment, current A-Token/A-Pass/CCP
ABIs and addresses, the onchain eligibility interface, test assets and confirmation
that Confiance can directly transfer to an eligible recipient. The engineer can
implement the adapter once these facts are available. No compliance claim is
enabled by filling address variables alone.

## Handoff

First complete owner passkey/funding and Privy/LLM credentials. Provide only public
owner/contractor addresses and the repository/PR identifiers in chat. Tell the
engineer when local credentials are saved. Continue with [SETUP.md](SETUP.md) for
deployment, metadata hosting, reporter authorization and the full receipt-backed demo.
