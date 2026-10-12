import { encodeAbiParameters, keccak256, parseAbi, type Address } from "viem";
/** ABI copied from the official ERC-8004 IdentityRegistryUpgradeable source; check live version before writes. */
export const identityAbi = parseAbi([
  "function getVersion() pure returns (string)",
  "function register(string agentURI) returns (uint256 agentId)",
  "function ownerOf(uint256 agentId) view returns (address)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "function tokenURI(uint256 agentId) view returns (string)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
]);
export function identityCommitment(registry: Address, tokenId: bigint) {
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }, { type: "uint256" }],
      [10143n, registry, tokenId],
    ),
  );
}
