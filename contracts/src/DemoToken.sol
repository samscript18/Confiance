// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only denomination. NOT a stablecoin, A-Token, or Cleanverse integration.
contract DemoToken is ERC20 {
    constructor(address recipient) ERC20("Confiance Test Token", "CTT") {
        require(block.chainid == 31337 || block.chainid == 10143, "TESTNET_ONLY");
        _mint(recipient, 1000 * 10 ** decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
