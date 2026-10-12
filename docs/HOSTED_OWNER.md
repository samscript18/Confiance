# Moving owner controls to the live website

The original testnet account has an immutable localhost passkey owner. It cannot
be reassigned to a new passkey address. The live website therefore creates a new
owner and a new account while retaining the original deployment and proofs.

## Owner steps

1. Open [live owner setup](https://confiance-eta.vercel.app/owner-setup).
2. Create the live passkey. Returning visits use **Sign in with live passkey**.
3. Send testnet MON from the official faucet to the displayed owner address.
4. Click **Check funding**, then **Deploy Confiance**.
5. Share the public deployment transaction hash with the project operator.

The page checks chain 10143, transaction success, creation calldata, deployer and
onchain ownership before displaying a confirmed account. Pending submissions are
saved as public transaction metadata and checked again after returning sign-in;
the page does not silently submit another deployment after an interrupted wait.
Only passkey credential metadata and public deployment metadata are persisted.
Creating an account grants no agent session and performs no payroll payment.

## Operator cutover

This deployment is a single-owner MVP. Account creation does not let arbitrary
website visitors take over the hosted backend. The operator must independently
verify the supplied receipt and explicitly connect the intended owner.

1. Preserve the original account deployment and all existing transaction proofs.
2. Verify the new creation transaction against the compiled artifact on Monad
   testnet, including the immutable owner and deployment block.
3. Configure Render with the new owner, account and block. Use a separate MongoDB
   storage namespace for its task, monitoring, authentication and receipts.
   Keep monitoring disabled until the new owner approves a fresh policy.
4. Set Render's `WEB_ORIGIN` to the live Vercel origin and clear
   `OWNER_CONSOLE_URL`. Keep provider secrets on Render.
5. Deploy Render and Vercel. Confirm live-domain sign-in and signed-out privacy.
6. The owner funds the new treasury and registers/authorizes the separate Privy
   agent, then authorizes the actual CRE reporter from verified workflow metadata.
7. Save the payroll task through the UI. CRE discovers the new account through
   the hosted task endpoint and validates its actual onchain policy.
8. Add the verified new address and start block to the Envio deployment, retaining
   the original address if historical demo records remain part of the index.
9. Prove an authorized autonomous payment, an over-limit rejection and revocation
   with the same agent signer on the new account. Record actual receipts.

Until those steps finish, live owner migration is pending. The historical payment
proofs remain valid for the original deployment; they are not proof of payments
from the newly created account. Cleanverse enrollment remains a separate blocker.
