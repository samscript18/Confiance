import {
  getAddress,
  isAddress,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem";

export interface ReporterSettings {
  forwarder: Address;
  workflowId: Hex;
  workflowOwner: Address;
}

export function parseReporterSettings(input: {
  forwarder: string;
  workflowId: string;
  workflowOwner: string;
}): ReporterSettings {
  const forwarder = input.forwarder.trim();
  const workflowOwner = input.workflowOwner.trim();
  const id = input.workflowId.trim();
  const workflowId = id.startsWith("0x") ? id : `0x${id}`;
  if (!isAddress(forwarder) || forwarder.toLowerCase() === zeroAddress)
    throw new Error(
      "Enter the Monad testnet CRE forwarder address (0x followed by 40 hex characters).",
    );
  if (!/^0x[0-9a-fA-F]{64}$/.test(workflowId) || workflowId === zeroHash)
    throw new Error(
      "Enter the deployed workflow ID: a 32-byte hash, not the workflow name.",
    );
  if (!isAddress(workflowOwner) || workflowOwner.toLowerCase() === zeroAddress)
    throw new Error(
      "Enter the CRE workflow owner's EVM address (0x followed by 40 hex characters).",
    );
  return {
    forwarder: getAddress(forwarder),
    workflowId: workflowId as Hex,
    workflowOwner: getAddress(workflowOwner),
  };
}
