// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Confiance} from "../src/Confiance.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface SessionVm {
    function envAddress(string calldata) external returns (address);
    function envBytes32(string calldata) external returns (bytes32);
    function envString(string calldata) external returns (string memory);
    function envUint(string calldata) external returns (uint256);
    function envOr(string calldata, bool) external returns (bool);
    function envOr(string calldata, address) external returns (address);
    function envOr(string calldata, uint256) external returns (uint256);
    function toString(uint256) external pure returns (string memory);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Interim owner setup via encrypted keystore. Not a substitute for final Mera onboarding.
contract Authorize {
    SessionVm private constant VM = SessionVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external {
        require(block.chainid == 10143, "MONAD_TESTNET_REQUIRED");
        Confiance account = Confiance(VM.envAddress("CONFIANCE_ADDRESS"));
        address agent = VM.envAddress("AGENT_ADDRESS");
        address asset = VM.envAddress("PAYMENT_ASSET");
        bytes32 identity = VM.envBytes32("AGENT_IDENTITY_COMMITMENT");
        uint256 decimals = IERC20Metadata(asset).decimals();
        require(decimals <= 36, "UNSUPPORTED_DECIMALS");
        uint256 limit = VM.envOr("SESSION_LIMIT_WHOLE_UNITS", uint256(50)) * 10 ** decimals;
        bool smoke = VM.envOr("CORE_SMOKE_TEST", false);
        bytes32 condition;
        if (!smoke) {
            string memory repo = VM.envString("GITHUB_REPO");
            uint256 pr = VM.envUint("GITHUB_PR_NUMBER");
            require(bytes(repo).length > 0 && pr > 0, "REAL_MILESTONE_REQUIRED");
            condition = keccak256(abi.encodePacked("github:", repo, ":", VM.toString(pr)));
        }
        Confiance.Policy memory policy = Confiance.Policy({
            allowedAsset: asset,
            allowedRecipient: VM.envAddress("PAYMENT_RECIPIENT"),
            spendingLimit: limit,
            expiry: block.timestamp + 24 hours,
            complianceAdapter: VM.envOr("CLEANVERSE_ADAPTER", address(0)),
            requiredCondition: condition
        });
        vmBroadcast(account, agent, identity, policy);
    }

    function vmBroadcast(Confiance account, address agent, bytes32 identity, Confiance.Policy memory policy)
        private
    {
        VM.startBroadcast();
        bytes32 existing = account.identities(agent);
        if (existing == bytes32(0)) account.registerAgent(agent, identity);
        else require(existing == identity, "REGISTERED_IDENTITY_MISMATCH");
        account.createSession(agent, policy);
        VM.stopBroadcast();
    }
}

contract Revoke {
    SessionVm private constant VM = SessionVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external {
        require(block.chainid == 10143, "MONAD_TESTNET_REQUIRED");
        Confiance account = Confiance(VM.envAddress("CONFIANCE_ADDRESS"));
        address agent = VM.envAddress("AGENT_ADDRESS");
        VM.startBroadcast();
        account.revokeSession(agent);
        VM.stopBroadcast();
    }
}
