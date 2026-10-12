// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IComplianceAdapter} from "./interfaces/IComplianceAdapter.sol";

/// @notice A treasury with bounded authority for independently signing agent EOAs.
/// @dev No arbitrary calldata, delegatecall, approvals, or owner key in the agent path.
contract Confiance is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Policy {
        address allowedAsset;
        address allowedRecipient;
        uint256 spendingLimit;
        uint256 expiry;
        address complianceAdapter;
        bytes32 requiredCondition;
    }

    struct Session {
        bool exists;
        bool active;
        uint256 generation;
        uint256 spent;
        Policy policy;
    }

    struct Reporter {
        address forwarder;
        bytes32 workflowId;
        address workflowOwner;
    }

    address public immutable owner;
    Reporter public reporter;
    mapping(address agent => bytes32 identity) public identities;
    mapping(address agent => Session session) private sessions;
    // Lifetime nonce: never reset by policy edits, revocation, or new sessions.
    mapping(address agent => uint256 nonce) public nonces;
    mapping(bytes32 condition => bool verified) public verifiedConditions;

    error OWNER_ONLY();
    error INVALID_POLICY();
    error AGENT_NOT_REGISTERED();
    error AGENT_ALREADY_REGISTERED();
    error SESSION_NOT_CREATED();
    error SESSION_ALREADY_ACTIVE();
    error SESSION_REVOKED();
    error SESSION_EXPIRED();
    error SESSION_SPENDING_LIMIT();
    error ASSET_NOT_ALLOWED();
    error RECIPIENT_NOT_ELIGIBLE();
    error CONDITION_NOT_VERIFIED();
    error INVALID_NONCE();
    error INVALID_GENERATION();
    error INVALID_AMOUNT();
    error UNAUTHORIZED_REPORT();
    error INVALID_REPORT();
    error CONDITION_ALREADY_VERIFIED();
    error UNSUPPORTED_TOKEN_BEHAVIOR();

    event AgentRegistered(address indexed agent, bytes32 indexed identity);
    event SessionCreated(address indexed agent, uint256 indexed generation, Policy policy);
    event PolicyUpdated(address indexed agent, uint256 indexed generation, Policy policy);
    event SessionRevoked(address indexed agent, uint256 indexed generation);
    event PaymentRequested(
        address indexed agent,
        address indexed recipient,
        address indexed asset,
        uint256 amount,
        uint256 nonce,
        uint256 generation
    );
    event PaymentExecuted(
        address indexed agent,
        address indexed recipient,
        address indexed asset,
        uint256 amount,
        uint256 nonce,
        uint256 generation
    );
    event ConditionVerified(bytes32 indexed condition, bytes32 indexed evidence, bytes32 indexed workflowId);
    event ReporterConfigured(
        address indexed forwarder, bytes32 indexed workflowId, address indexed workflowOwner
    );

    modifier onlyOwner() {
        if (msg.sender != owner) revert OWNER_ONLY();
        _;
    }

    constructor(address owner_) {
        if (owner_ == address(0)) revert INVALID_POLICY();
        owner = owner_;
    }

    function registerAgent(address agent, bytes32 identity) external onlyOwner {
        if (agent == address(0) || agent == owner || identity == bytes32(0)) revert INVALID_POLICY();
        if (identities[agent] != bytes32(0)) revert AGENT_ALREADY_REGISTERED();
        identities[agent] = identity;
        emit AgentRegistered(agent, identity);
    }

    function getSession(address agent) external view returns (Session memory) {
        return sessions[agent];
    }

    /// @notice A new session explicitly grants a new total budget after revocation/expiry.
    function createSession(address agent, Policy calldata policy) external onlyOwner {
        if (identities[agent] == bytes32(0)) revert AGENT_NOT_REGISTERED();
        _validatePolicy(policy);
        Session storage session = sessions[agent];
        if (session.active && block.timestamp < session.policy.expiry) revert SESSION_ALREADY_ACTIVE();
        session.exists = true;
        session.active = true;
        session.generation += 1;
        session.spent = 0;
        session.policy = policy;
        emit SessionCreated(agent, session.generation, policy);
    }

    /// @notice Edits preserve spending, invalidate queued old-generation requests, and do not reactivate.
    function updatePolicy(address agent, Policy calldata policy) external onlyOwner {
        Session storage session = sessions[agent];
        if (!session.exists) revert SESSION_NOT_CREATED();
        if (!session.active) revert SESSION_REVOKED();
        _validatePolicy(policy);
        if (policy.allowedAsset != session.policy.allowedAsset || policy.spendingLimit < session.spent) {
            revert INVALID_POLICY();
        }
        session.generation += 1;
        session.policy = policy;
        emit PolicyUpdated(agent, session.generation, policy);
    }

    function revokeSession(address agent) external onlyOwner {
        Session storage session = sessions[agent];
        if (!session.exists) revert SESSION_NOT_CREATED();
        session.active = false;
        emit SessionRevoked(agent, session.generation);
    }

    /// @notice Only the independently signing registered agent can spend its session.
    /// @dev Nonce AND policy generation bind requests across policy/session changes.
    function executePayment(
        address recipient,
        address asset,
        uint256 amount,
        uint256 nonce,
        uint256 generation
    ) external nonReentrant {
        address agent = msg.sender;
        if (identities[agent] == bytes32(0)) revert AGENT_NOT_REGISTERED();
        Session storage session = sessions[agent];
        if (!session.exists) revert SESSION_NOT_CREATED();
        if (!session.active) revert SESSION_REVOKED();
        Policy memory policy = session.policy;
        if (block.timestamp >= policy.expiry) revert SESSION_EXPIRED();
        if (generation != session.generation) revert INVALID_GENERATION();
        if (nonce != nonces[agent]) revert INVALID_NONCE();
        if (amount == 0) revert INVALID_AMOUNT();
        if (asset != policy.allowedAsset) revert ASSET_NOT_ALLOWED();
        if (amount > policy.spendingLimit - session.spent) revert SESSION_SPENDING_LIMIT();
        if (recipient == address(0) || recipient == address(this) || recipient != policy.allowedRecipient) {
            revert RECIPIENT_NOT_ELIGIBLE();
        }
        if (policy.complianceAdapter != address(0)) {
            if (!IComplianceAdapter(policy.complianceAdapter).checkAssetEligibility(asset)) {
                revert ASSET_NOT_ALLOWED();
            }
            if (!IComplianceAdapter(policy.complianceAdapter).checkRecipientEligibility(recipient)) {
                revert RECIPIENT_NOT_ELIGIBLE();
            }
        }
        if (policy.requiredCondition != bytes32(0) && !verifiedConditions[policy.requiredCondition]) {
            revert CONDITION_NOT_VERIFIED();
        }

        session.spent += amount;
        nonces[agent] = nonce + 1;
        emit PaymentRequested(agent, recipient, asset, amount, nonce, generation);
        uint256 treasuryBefore = IERC20(asset).balanceOf(address(this));
        uint256 recipientBefore = IERC20(asset).balanceOf(recipient);
        IERC20(asset).safeTransfer(recipient, amount);
        // Fail closed for fee/rebase tokens: spent must match actual treasury debit and recipient credit.
        uint256 treasuryAfter = IERC20(asset).balanceOf(address(this));
        uint256 recipientAfter = IERC20(asset).balanceOf(recipient);
        if (
            treasuryAfter > treasuryBefore || treasuryBefore - treasuryAfter != amount
                || recipientAfter < recipientBefore || recipientAfter - recipientBefore != amount
        ) {
            revert UNSUPPORTED_TOKEN_BEHAVIOR();
        }
        emit PaymentExecuted(agent, recipient, asset, amount, nonce, generation);
    }

    /// @notice Owner pins a verified production Chainlink forwarder and exact workflow identity.
    /// @dev Starts disabled. There is no permissive zero-address reporting mode.
    function configureReporter(Reporter calldata config) external onlyOwner {
        if (
            config.forwarder.code.length == 0 || config.workflowId == bytes32(0)
                || config.workflowOwner == address(0)
        ) revert INVALID_POLICY();
        reporter = config;
        emit ReporterConfigured(config.forwarder, config.workflowId, config.workflowOwner);
    }

    /// @notice Standard CRE IReceiver callback; signatures are checked by the pinned forwarder.
    /// @dev Metadata: bytes32 workflowId | bytes10 workflowName | address workflowOwner | optional bytes2 reportId.
    /// Report: abi.encode(chainId, receiver, condition, evidenceHash).
    function onReport(bytes calldata metadata, bytes calldata report) external {
        Reporter memory config = reporter;
        if (config.forwarder == address(0) || msg.sender != config.forwarder) revert UNAUTHORIZED_REPORT();
        if (metadata.length != 62 && metadata.length != 64) revert INVALID_REPORT();
        if (
            bytes32(metadata[0:32]) != config.workflowId
                || address(bytes20(metadata[42:62])) != config.workflowOwner
        ) revert UNAUTHORIZED_REPORT();
        if (report.length != 128) revert INVALID_REPORT();
        (uint256 chainId, address receiver, bytes32 condition, bytes32 evidence) =
            abi.decode(report, (uint256, address, bytes32, bytes32));
        if (
            chainId != block.chainid || receiver != address(this) || condition == bytes32(0)
                || evidence == bytes32(0)
        ) revert INVALID_REPORT();
        if (verifiedConditions[condition]) revert CONDITION_ALREADY_VERIFIED();
        verifiedConditions[condition] = true;
        emit ConditionVerified(condition, evidence, config.workflowId);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == this.onReport.selector;
    }

    function _validatePolicy(Policy calldata policy) private view {
        if (
            policy.allowedAsset.code.length == 0 || policy.allowedRecipient == address(0)
                || policy.allowedRecipient == address(this) || policy.spendingLimit == 0
                || policy.expiry <= block.timestamp
        ) revert INVALID_POLICY();
        if (policy.complianceAdapter != address(0) && policy.complianceAdapter.code.length == 0) {
            revert INVALID_POLICY();
        }
    }
}
