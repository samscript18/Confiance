import assert from "node:assert/strict";
import test from "node:test";
import { zeroAddress, zeroHash } from "viem";
import { parseReporterSettings } from "../packages/shared/reporter.js";

const settings = {
  forwarder: "0x1111111111111111111111111111111111111111",
  workflowId: `0x${"ab".repeat(32)}`,
  workflowOwner: "0x2222222222222222222222222222222222222222",
};
test("reporter setup accepts pasted whitespace and an unprefixed deployed hash", () => {
  assert.deepEqual(
    parseReporterSettings({
      forwarder: ` ${settings.forwarder} `,
      workflowId: ` ${settings.workflowId.slice(2)} `,
      workflowOwner: ` ${settings.workflowOwner} `,
    }),
    settings,
  );
});
test("reporter setup rejects missing metadata, workflow names, nonhex and zero authority", () => {
  for (const workflowId of [
    "",
    "confiance-github-milestone",
    `0x${"gg".repeat(32)}`,
    zeroHash,
  ])
    assert.throws(
      () => parseReporterSettings({ ...settings, workflowId }),
      /32-byte hash/,
    );
  for (const forwarder of ["", zeroAddress, "0x1234"])
    assert.throws(
      () => parseReporterSettings({ ...settings, forwarder }),
      /forwarder address/,
    );
  for (const workflowOwner of ["", zeroAddress, "0x1234"])
    assert.throws(
      () => parseReporterSettings({ ...settings, workflowOwner }),
      /workflow owner's/,
    );
});
