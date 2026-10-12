// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Confiance} from "../src/Confiance.sol";
import {DemoToken} from "../src/DemoToken.sol";

interface DeploymentVm {
    function envAddress(string calldata) external returns (address);
    function envOr(string calldata, bool) external returns (bool);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Use --account with an encrypted Foundry keystore. No plaintext key input.
contract Deploy {
    DeploymentVm private constant vm = DeploymentVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (Confiance account, address testAsset) {
        require(block.chainid == 10143, "MONAD_TESTNET_REQUIRED");
        address owner = vm.envAddress("CONFIANCE_OWNER");
        bool deployTestToken = vm.envOr("DEPLOY_TEST_TOKEN", false);
        vm.startBroadcast();
        account = new Confiance(owner);
        if (deployTestToken) testAsset = address(new DemoToken(address(account)));
        vm.stopBroadcast();
    }
}
