// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IComplianceAdapter} from "./interfaces/IComplianceAdapter.sol";

/// @dev Read-only subset documented in Cleanverse's CVI Validator V2 guide.
interface ICleanverseValidator {
    function isRegistered(address poolAddress) external view returns (bool);
    function complianceVerify(address poolAddress, address userAddress) external view returns (bool);
}

interface ICleanverseAsset {
    function policy() external view returns (address);
}

/// @notice CVI gating for an enrolled Confiance account and an owner-selected CVA.
/// @dev Disabled until real enrollment. CVA transfer policy remains enforced by the asset itself.
/// No registration, rule mutation, custody, approvals or token transfer permissions live here.
contract CleanverseValidatorAdapter is IComplianceAdapter {
    ICleanverseValidator public immutable validator;
    address public immutable account;
    address public immutable asset;
    address public immutable policy;

    error InvalidConfiguration();
    error AccountNotRegistered();

    constructor(address validator_, address account_, address asset_, address policy_) {
        if (
            validator_.code.length == 0 || account_.code.length == 0 || asset_.code.length == 0
                || policy_.code.length == 0 || ICleanverseAsset(asset_).policy() != policy_
        ) revert InvalidConfiguration();
        validator = ICleanverseValidator(validator_);
        if (!validator.isRegistered(account_)) revert AccountNotRegistered();
        account = account_;
        asset = asset_;
        policy = policy_;
    }

    function checkAssetEligibility(address asset_) external view returns (bool) {
        return asset_ == asset && ICleanverseAsset(asset).policy() == policy
            && validator.isRegistered(account) && validator.complianceVerify(account, account);
    }

    function checkRecipientEligibility(address recipient) external view returns (bool) {
        return validator.isRegistered(account) && validator.complianceVerify(account, recipient);
    }
}
