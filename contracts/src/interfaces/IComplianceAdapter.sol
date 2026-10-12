// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Confiance's internal boundary, NOT a purported Cleanverse ABI.
/// @dev An official adapter must be independently confirmed before deployment.
interface IComplianceAdapter {
    function checkRecipientEligibility(address recipient) external view returns (bool);
    function checkAssetEligibility(address asset) external view returns (bool);
}
