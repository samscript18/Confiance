# Cleanverse: verified setup and remaining payment proof

Updated 2026-10-13. These records describe the live-domain Confiance account,
not the earlier localhost account. CTT payments remain separate evidence.

## Verified on Monad testnet

- Confiance: `0xde4dfd84ed78c4c65d7670e22be1e002403f057f`.
- Contractor: `0x421Ab98aeb38cB022fE80d5bd1da7ea404BDD90b`.
- Validator: `0xA64529732B52EFFD2B245320E88226D72c23b788`.
- aUSDC: `0xaC0893567D43C3E7e6e35a72803df05416C1f20D`, six decimals.
- Adapter: `0xf2403571b7fe9849f8482ea566177eeee689df99`.

The owner-approved [registration receipt](https://testnet.monadexplorer.com/tx/0x74fc37c89ae20fed923210d47c073ef4f248aece7d12a33c9fff020699d59243)
succeeded at block **70650040**. After synchronizing the correct API-key pairing,
Cleanverse accepted the encrypted registration. The previous decryption failure
is resolved for this account.

Following support's permission confirmation and the official
[CVI guide](https://docs.cleanverse.com/ccp/cvi/), the Generate CVI API issued
credentials to both addresses. Requests used internal customer IDs, a 30-day
expiry and `override:false`; optional identity documents, bank details and KYC
claims were omitted. The provider selected tier 20. This sandbox issuance is
not evidence that a real-world KYC investigation took place.

- [Treasury CVI](https://testnet.monadexplorer.com/tx/0x8d54b02fd22aafb8d910f7751cff0d56c61c7b459d7c5bdf45596ec9318db6ed): block **70678818**, success.
- [Contractor CVI](https://testnet.monadexplorer.com/tx/0xa76496c778e3ee5f1993c3613a1c549b70b135e8e0e313f0ac8ed5c2b5ece1c5): block **70678840**, success.
- [Adapter deployment](https://testnet.monadexplorer.com/tx/0x1bcc4c426fe8ce80c293ded01aac2b049f41be48970c223359f8163893a02016): block **70679868**, success. Creation calldata, sender and immutable bindings were checked.
- [Direct aUSDC faucet funding](https://testnet.monadexplorer.com/tx/0xf7d3dcb81ff31cecf3ab6d4d99ebf71f6f37d425b2a4c092e1117889830c2a7a): block **70681581**, success; treasury balance **0.1 test aUSDC** at verification.

The adapter's account and recipient eligibility methods both return true.
A direct transfer of **0.05 aUSDC** from Confiance to the contractor simulates
successfully. This is simulation evidence, not a completed payment.

Machine-readable records: [CVI issuance](research/cleanverse-cvi-issuance.json),
[adapter](research/cleanverse-adapter-deployment.json), and
[funding and simulation](research/cleanverse-ausdc-funding.json).

## Finish through the owner interface

1. Sign in with the live-domain owner passkey and open Agent → Permissions.
2. Revoke the current CTT session before changing assets. Past receipts remain.
3. Choose **Cleanverse asset and credential checks**. Review the token and
   contractor. Keep the credential requirement enabled.
4. Enter an affordable task payment, for example **0.05 aUSDC**, and review the
   total session budget, 24-hour expiry and actual GitHub milestone.
5. Authorize the new session with the owner passkey. The saved task must use
   that receipt and exactly match the approved asset, recipient and milestone.
6. Run the real Payroll Agent or start monitoring. Only the separate Privy
   signer submits the payment; the owner does not approve this payment.
7. Verify the actual `PaymentExecuted` and token `Transfer` events, sender,
   amount and contractor balance. Then record compliant settlement evidence.
8. Complete a real ineligible-recipient rejection proof. The existing CTT
   wrong-address diagnostic proves the pinned-recipient rule, not CVI gating.

Confiance checks the adapter on every payment. The A-Token itself additionally
enforces its transfer policy. The frontend cannot grant eligibility.

## Funding limitation

Larger aUSDC faucet requests failed because the faucet lacked sufficient tokens.
A smaller **0.1 aUSDC** request succeeded; do not present this as 50 aUSDC funding.
Separately, the origin-USDC faucet sent **5 USDC** to the API-provided deposit
address. Those funds had not converted to aUSDC when checked. That deposit is
not counted as treasury funding; see [deposit record](research/cleanverse-usdc-deposit.json).
Ask Cleanverse to inspect that conversion or replenish its aUSDC faucet for a
larger demo. No minter role or compliance bypass was requested.

Until the actual agent payment confirms, Cleanverse settlement is incomplete.
