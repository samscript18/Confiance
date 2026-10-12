# GitHub milestone workflow

Implemented with @chainlink/cre-sdk 1.23.0. `npm run cre:build` compiles the real
workflow to WASM with strict types and runtime compatibility validation.
`npm run cre:setup` prepares the pinned Bun runtime when its npm hook was skipped.

The workflow polls the public GitHub PR through CRE HTTP capabilities, requires
matching repository/PR and validated merge evidence, reaches identical consensus,
checks prior onchain verification, generates a domain-bound report and uses CRE
EVM writeReport. It checks both transaction and receiver execution status.
There is no backend shortcut to verification.

Tenant authentication returned 403 in this environment. No workflow was deployed,
activated or delivered to Monad. Confirm authenticated Monad testnet production-write
support and its forwarder before setting CRE_MONAD_TESTNET_WRITE_CONFIRMED=true
and running `npm run cre:configure`. The published selector is routing metadata,
not proof of write access. Pin exact deployed workflow ID/owner/forwarder in Confiance.

Report: abi.encode(uint256 chainId, address receiver, bytes32 condition, bytes32 evidence).
Condition: keccak256(utf8("github:<owner>/<repo>:<prNumber>")); merge evidence binds
repository, PR, merge commit and merged timestamp. See ../docs/SETUP.md.
