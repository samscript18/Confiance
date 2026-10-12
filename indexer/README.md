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

No live indexer or Monad event ingestion has been proven. Reverted transactions
have no logs: the dashboard verifies saved failed receipts independently and labels
simulation-derived reasons rather than manufacturing PaymentRejected events.

Pinned declaration-only repairs and compatible dependency overrides are documented
in ../docs/INTEGRATIONS.md. See ../docs/SETUP.md for the complete run procedure.
