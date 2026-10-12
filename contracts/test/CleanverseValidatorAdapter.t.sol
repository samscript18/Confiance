// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CleanverseValidatorAdapter, ICleanverseValidator} from "../src/CleanverseValidatorAdapter.sol";

// Local unit fixtures only. They are not Cleanverse deployment or compliance proofs.
contract ValidatorFixture is ICleanverseValidator {
    bool public registered = true;
    bool public broken;
    address public lastPool;
    mapping(address => bool) public eligible;

    function configure(bool registered_, bool broken_) external {
        registered = registered_;
        broken = broken_;
    }

    function allow(address who, bool value) external {
        eligible[who] = value;
    }

    function isRegistered(address) external view returns (bool) {
        require(!broken);
        return registered;
    }

    function complianceVerify(address pool, address user) external view returns (bool) {
        require(!broken);
        require(pool == lastPool);
        return eligible[user];
    }

    function pinPool(address pool) external {
        lastPool = pool;
    }
}

contract AssetFixture {
    address public policy;

    constructor(address policy_) {
        policy = policy_;
    }

    function changePolicy(address policy_) external {
        policy = policy_;
    }
}

contract ContractFixture {}

interface AdapterVm {
    function expectRevert(bytes4) external;
    function expectRevert() external;
}

contract CleanverseValidatorAdapterTest {
    AdapterVm constant vm = AdapterVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    ValidatorFixture validator;
    AssetFixture asset;
    address account;
    address policy;
    CleanverseValidatorAdapter adapter;
    address recipient = address(0xCAFE);

    function setUp() public {
        validator = new ValidatorFixture();
        account = address(new ContractFixture());
        policy = address(new ContractFixture());
        asset = new AssetFixture(policy);
        validator.pinPool(account);
        validator.allow(account, true);
        validator.allow(recipient, true);
        adapter = new CleanverseValidatorAdapter(address(validator), account, address(asset), policy);
    }

    function testEnrolledAccountAndRecipientPass() public view {
        require(adapter.checkAssetEligibility(address(asset)));
        require(adapter.checkRecipientEligibility(recipient));
    }

    function testWrongAssetFails() public view {
        require(!adapter.checkAssetEligibility(address(0xBAD)));
    }

    function testIneligibleRecipientFails() public view {
        require(!adapter.checkRecipientEligibility(address(0xBAD)));
    }

    function testIneligibleTreasuryFails() public {
        validator.allow(account, false);
        require(!adapter.checkAssetEligibility(address(asset)));
    }

    function testLostRegistrationFails() public {
        validator.configure(false, false);
        require(!adapter.checkAssetEligibility(address(asset)));
        require(!adapter.checkRecipientEligibility(recipient));
    }

    function testBrokenValidatorFailsClosed() public {
        validator.configure(true, true);
        vm.expectRevert();
        adapter.checkRecipientEligibility(recipient);
    }

    function testChangedTokenPolicyFails() public {
        asset.changePolicy(address(0xBAD));
        require(!adapter.checkAssetEligibility(address(asset)));
    }

    function testUnregisteredDeploymentFails() public {
        validator.configure(false, false);
        vm.expectRevert(CleanverseValidatorAdapter.AccountNotRegistered.selector);
        new CleanverseValidatorAdapter(address(validator), account, address(asset), policy);
    }

    function testMissingCodeFails() public {
        vm.expectRevert(CleanverseValidatorAdapter.InvalidConfiguration.selector);
        new CleanverseValidatorAdapter(address(validator), address(0xBAD), address(asset), policy);
    }

    function testMismatchedTokenPolicyFails() public {
        vm.expectRevert(CleanverseValidatorAdapter.InvalidConfiguration.selector);
        new CleanverseValidatorAdapter(address(validator), account, address(asset), account);
    }
}
