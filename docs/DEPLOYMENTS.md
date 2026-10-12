# Deployments

**No Confiance deployment exists yet.** No project transaction hashes or addresses
have been fabricated.

Target: Monad Testnet, chain ID **10143**. Its public RPC was checked and returned
the correct ID on 2026-10-08.

| Project component         | Status                                                     |
| ------------------------- | ---------------------------------------------------------- |
| Confiance smart account   | Not deployed; funded owner signer required                 |
| Project test token        | Not deployed on Monad                                      |
| Payroll ERC-8004 identity | Not registered                                             |
| Authorized CRE workflow   | Not deployed / tenant access unavailable                   |
| Cleanverse adapter        | Not implemented; eligibility ABI and enrollment unresolved |

Third-party Cleanverse contracts with verified code are recorded separately in
[INTEGRATIONS.md](INTEGRATIONS.md); code presence is not compliance proof.

Once deployed, run `npm run record:deployment -- <creation transaction hash>`.
That script verifies chain ID, receipt success, creation calldata against this
build, code presence and configured owner, then replaces this status with actual
receipt evidence. Save token and policy-setup receipts separately. Source
verification and full agent-payment proof are additional required checks.

The local Anvil smoke test writes `proofs/local-smoke.json`. Its ephemeral
addresses and hashes are valid only on that local chain, not Monad testnet.
