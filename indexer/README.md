# Confiance Envio indexer

Envio 3.14.0, GraphQL Activity schema and typed handlers for all eight Confiance
events. Each entity ID includes chain/transaction/log index. Historical activity
never determines execution authority. Reorg rollback remains enabled by default.

`npm run indexer:typecheck` prepares the compiled ABI and runs codegen with a
skipped address-free configuration. It is only a type check, not live indexing.
After a verified deployment, `npm run indexer:configure` rechecks its receipt and
writes the actual address/start block/ABI configuration. Then supply
ENVIO_MONAD_RPC_URL and run `npm run indexer:start` with the documented Envio
database environment. Point ENVIO_GRAPHQL_URL at the actual GraphQL endpoint.

Local Envio ingestion has been verified against the real Confiance account.
The hosted backend currently uses checked Monad receipts/RPC while cloud indexing
is being provisioned. Reverted transactions
have no logs: the dashboard verifies saved failed receipts independently and labels
simulation-derived reasons rather than manufacturing PaymentRejected events.

Pinned declaration-only repairs and compatible dependency overrides are documented
in ../docs/INTEGRATIONS.md. See ../docs/SETUP.md for the complete run procedure.

## Envio Cloud

The `confiance` indexer has been created under `samscript18`, with automatic
deployments disabled during verification. Its public Monad RPC is configured.
The Development tier is free and limited to a maximum 30-day deployment lifetime;
see the current official pricing/billing documentation before production use.

Deploy branch `dev`, indexer directory `indexer`, config file `config.cloud.yaml`,
development tier and public GraphQL access. Set `ENVIO_MONAD_RPC_URL` to the actual
Monad testnet RPC. The cloud config and committed ABI derive from the verified
Confiance deployment at block 70364758; neither contains provider credentials.
This directory has its own exact-pinned package manifest and declaration repair,
so the cloud build does not import files outside its upload boundary.

The official `envio-cloud` CLI was inspected at version 1.0.0. Browser login and
the Envio Deployments GitHub app's repository access require the human account.
Read the actual deployment GraphQL endpoint after it is synced; never assume a
hostname. Configure that endpoint on Render and verify matching payment events
before labeling hosted activity as Envio history.
