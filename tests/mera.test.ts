import assert from "node:assert/strict";
import test from "node:test";
import { createSecp256k1SigningSession } from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { verifyMessage } from "viem";
test("Mera owner signing verifies and ending the session disables the same account", async () => {
  const key = new Uint8Array(32);
  key[31] = 1;
  const session = createSecp256k1SigningSession({ privateKey: key });
  key.fill(0);
  const account = toViemAccount(session);
  const message = "Confiance local owner authentication test";
  const signature = await account.signMessage({ message });
  assert.equal(
    await verifyMessage({ address: account.address, message, signature }),
    true,
  );
  session.end();
  await assert.rejects(account.signMessage({ message }));
});
