# Repository inspection and implementation plan

Inspected 2026-10-08 before any edits. Read AGENTS.md in full (sections 0–64).

The repository contained AGENTS.md only, with no Git metadata, dependencies,
configuration, framework, or existing application to preserve. No relevant
credentials were present in the process environment. The owner confirmed they
do not yet have provider accounts or a funded deployment account.

Installed: Foundry 1.5.1, Node 26.4.0, npm 11.17.0, pnpm 9.15.4,
CRE CLI 1.33.0. Use npm with a lockfile, TypeScript strict mode, Solidity 0.8.28,
Foundry, and eventually Next.js. Do not introduce a bundler or ERC-4337.

1. Create the foundation and test the contract, including real separate signer execution locally.
2. Prepare chain-checked Monad deployment and transaction proof collection. Deploy once funded owner signing is available.
3. Connect the LLM to deterministic tools and the server-side Privy agent signer; prove payment receipts.
4. Implement Mera owner setup and real ERC-8004 registration using verified current SDKs/deployments.
5. Prove CRE GitHub verification via an authenticated supported Monad testnet reporting path.
6. Confirm official Cleanverse smart-account support, addresses and ABI before implementing its adapter.
7. Index events through Envio; source failed transactions from receipts because reverted events do not survive.
8. Build and verify the consumer dashboard after execution smoke tests pass.
9. Run the full live demo and document verified deployments, tests and unresolved limits.

Each integration is pending until its required real operation is proven. Compilation is not live verification.

## Continued implementation

With the owner's instruction to implement the remaining paths, added the Next.js
Mera owner dashboard, authenticated backend orchestration, Privy provisioning,
ERC-8004 registration, CRE workflow and Envio handlers without inventing live
results. Updated runtime polling, durable locking and verified receipt recovery.
The execution smoke test remains a prerequisite; no live deployment or provider
operation is claimed while accounts/funding and CRE access are absent.
