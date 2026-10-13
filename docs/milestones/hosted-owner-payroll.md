# Hosted-owner payroll milestone

This milestone publishes the acceptance criteria for a fresh payroll rehearsal
using Confiance's live-domain owner account. Its GitHub merge establishes that
this document was reviewed and accepted. Blockchain execution requires the
owner's separately approved session and the actual CRE report.

## Account and authority

- Network: Monad Testnet, chain ID **10143**.
- Account: `0xde4dfd84ed78c4c65d7670e22be1e002403f057f`.
- Owner: `0xaf00668625e038f43c302283aECd6fF90265E42F`.
- Payroll signer: `0x9A62195Bb2C8eCeAaF306EC7Ee87f7e4994Ba11D`, provided by Privy.
- The owner approves the asset, contractor, total spending allowance, expiry
  and this PR's exact GitHub condition before monitoring starts.
- A **50-token total allowance**, **30-token payment** and **24-hour session**
  are the demonstration parameters to review in the policy form.

## Rehearsal acceptance criteria

1. Fund the new account with the exact approved ERC-20 and verify its balance.
2. Approve the separate agent and session with the live-domain owner passkey.
3. Save the payroll task bound to that confirmed policy receipt and this PR.
4. CRE verifies the actual merged GitHub state and delivers its authorized
   report to the new account. Verify the matching `ConditionVerified` event.
5. The real LLM requests the approved payment through its deterministic tool
   and Privy signer. The owner does not sign that payment.
6. Check the successful receipt, sender, account, asset, recipient, amount,
   `PaymentExecuted` event and balances before recording payment success.
7. Demonstrate over-limit rejection and same-key rejection after owner
   revocation with actual failed receipts and separately labeled diagnostics.

Merging this documentation milestone does not establish that these blockchain
steps have completed. Capture each real result in
[DEPLOYMENTS.md](../DEPLOYMENTS.md), keeping the earlier account's receipts
separate from this rehearsal.

## Compliance boundary

CTT is a test token. It does not establish USD value or Cleanverse compliance.
Enrollment, recipient eligibility and compliant settlement require their own
verified Cleanverse evidence. Follow [CLEANVERSE.md](../CLEANVERSE.md) for the
integration boundary and [DEMO.md](../DEMO.md) for the demonstration procedure.
