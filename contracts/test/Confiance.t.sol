// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Confiance} from "../src/Confiance.sol";
import {DemoToken} from "../src/DemoToken.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IComplianceAdapter} from "../src/interfaces/IComplianceAdapter.sol";

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert(bytes4) external;
    function expectRevert() external;
    function warp(uint256) external;
    function chainId(uint256) external;
    function addr(uint256) external returns (address);
}

/// @dev Unit-test fixtures only; never deployed by production scripts.
contract TestCompliance is IComplianceAdapter {
    bool public eligible = true;
    bool public assetEligible = true;
    bool public broken;

    function set(bool recipient_, bool asset_, bool broken_) external {
        eligible = recipient_;
        assetEligible = asset_;
        broken = broken_;
    }

    function checkRecipientEligibility(address) external view returns (bool) {
        require(!broken, "BROKEN_ADAPTER");
        return eligible;
    }

    function checkAssetEligibility(address) external view returns (bool) {
        require(!broken, "BROKEN_ADAPTER");
        return assetEligible;
    }
}

contract TestForwarder {
    function deliver(Confiance account, bytes memory metadata, bytes memory report) external {
        account.onReport(metadata, report);
    }
}

contract FeeToken is ERC20 {
    constructor(address recipient) ERC20("Fee fixture", "FEE") {
        _mint(recipient, 1000e6);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        _transfer(msg.sender, to, amount - 1);
        _burn(msg.sender, 1);
        return true;
    }
}

contract ReentrantAgentToken is ERC20 {
    Confiance private account;
    address private recipient;
    bool public callbackBlocked;
    constructor() ERC20("Reentry fixture", "REENTRY") {}

    function setup(Confiance account_, address recipient_) external {
        account = account_;
        recipient = recipient_;
        _mint(address(account_), 1000e6);
    }

    function pay() external {
        account.executePayment(recipient, address(this), 30e6, 0, 1);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        try account.executePayment(recipient, address(this), 1e6, 1, 1) {
            revert("REENTRY_SUCCEEDED");
        } catch {
            callbackBlocked = true;
        }
        return super.transfer(to, amount);
    }
}

contract ConfianceTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private owner;
    address private agent;
    address private david;
    Confiance private account;
    DemoToken private token;
    TestCompliance private compliance;
    TestForwarder private forwarder;
    bytes32 private constant CONDITION = keccak256("github:acme/payroll:42");
    bytes32 private constant WORKFLOW = keccak256("workflow");
    bytes10 private constant WORKFLOW_NAME = "payroll";

    function setUp() public {
        vm.chainId(31337);
        owner = vm.addr(1);
        agent = vm.addr(2);
        david = vm.addr(3);
        account = new Confiance(owner);
        token = new DemoToken(address(account));
        compliance = new TestCompliance();
        forwarder = new TestForwarder();
        vm.startPrank(owner);
        account.registerAgent(agent, keccak256("local-test-identity"));
        account.createSession(agent, policy());
        account.configureReporter(Confiance.Reporter(address(forwarder), WORKFLOW, owner));
        vm.stopPrank();
    }

    function policy() private view returns (Confiance.Policy memory) {
        return
            Confiance.Policy(address(token), david, 50e6, block.timestamp + 24 hours, address(0), bytes32(0));
    }

    function pay(uint256 amount, uint256 nonce) private {
        vm.prank(agent);
        account.executePayment(david, address(token), amount, nonce, 1);
    }

    function expectPaymentError(bytes4 error_, uint256 amount, uint256 nonce) private {
        vm.expectRevert(error_);
        pay(amount, nonce);
    }

    function verify(bytes memory metadata_, bytes memory report_) private {
        forwarder.deliver(account, metadata_, report_);
    }

    function metadata() private view returns (bytes memory) {
        return abi.encodePacked(WORKFLOW, WORKFLOW_NAME, owner, bytes2(0));
    }

    function report() private view returns (bytes memory) {
        return abi.encode(block.chainid, address(account), CONDITION, keccak256("merged-evidence"));
    }

    function testCriticalStorySameAgentKey() public {
        pay(30e6, 0);
        require(token.balanceOf(david) == 30e6, "recipient credit");
        require(account.getSession(agent).spent == 30e6, "onchain spending");
        expectPaymentError(Confiance.SESSION_SPENDING_LIMIT.selector, 500e6, 1);
        vm.prank(owner);
        account.revokeSession(agent);
        expectPaymentError(Confiance.SESSION_REVOKED.selector, 30e6, 1);
        require(token.balanceOf(david) == 30e6, "blocked payments moved funds");
    }

    function testThirtySucceeds() public {
        pay(30e6, 0);
        require(token.balanceOf(david) == 30e6);
    }

    function testFiftySucceeds() public {
        pay(50e6, 0);
        require(account.getSession(agent).spent == 50e6);
    }

    function testFiftyOneFails() public {
        expectPaymentError(Confiance.SESSION_SPENDING_LIMIT.selector, 51e6, 0);
    }

    function testFiveHundredFails() public {
        expectPaymentError(Confiance.SESSION_SPENDING_LIMIT.selector, 500e6, 0);
    }

    function testCumulativeLimit() public {
        pay(30e6, 0);
        expectPaymentError(Confiance.SESSION_SPENDING_LIMIT.selector, 21e6, 1);
        pay(20e6, 1);
        expectPaymentError(Confiance.SESSION_SPENDING_LIMIT.selector, 1, 2);
    }

    function testReplayFails() public {
        pay(30e6, 0);
        expectPaymentError(Confiance.INVALID_NONCE.selector, 1e6, 0);
    }

    function testFutureNonceFails() public {
        expectPaymentError(Confiance.INVALID_NONCE.selector, 30e6, 1);
    }

    function testZeroAmountFails() public {
        expectPaymentError(Confiance.INVALID_AMOUNT.selector, 0, 0);
    }

    function testExpiryBoundary() public {
        vm.warp(account.getSession(agent).policy.expiry);
        expectPaymentError(Confiance.SESSION_EXPIRED.selector, 30e6, 0);
    }

    function testBeforeExpirySucceeds() public {
        vm.warp(account.getSession(agent).policy.expiry - 1);
        pay(30e6, 0);
    }

    function testUnregisteredRejected() public {
        vm.expectRevert(Confiance.AGENT_NOT_REGISTERED.selector);
        vm.prank(david);
        account.executePayment(david, address(token), 30e6, 0, 1);
    }

    function testOwnerCannotExecuteAgentSession() public {
        vm.expectRevert(Confiance.AGENT_NOT_REGISTERED.selector);
        vm.prank(owner);
        account.executePayment(david, address(token), 30e6, 0, 1);
    }

    function testRegisteredWithoutSessionFails() public {
        vm.prank(owner);
        account.registerAgent(david, keccak256("other"));
        vm.expectRevert(Confiance.SESSION_NOT_CREATED.selector);
        vm.prank(david);
        account.executePayment(david, address(token), 1e6, 0, 1);
    }

    function testOnlyOwnerRegisters() public {
        vm.expectRevert(Confiance.OWNER_ONLY.selector);
        vm.prank(agent);
        account.registerAgent(david, keccak256("other"));
    }

    function testOnlyOwnerCreatesSession() public {
        Confiance.Policy memory p = policy();
        vm.expectRevert(Confiance.OWNER_ONLY.selector);
        vm.prank(agent);
        account.createSession(agent, p);
    }

    function testOnlyOwnerRevokes() public {
        vm.expectRevert(Confiance.OWNER_ONLY.selector);
        vm.prank(agent);
        account.revokeSession(agent);
    }

    function testAgentCannotIncreaseLimitOrExtendExpiry() public {
        Confiance.Policy memory p = policy();
        p.spendingLimit = 500e6;
        p.expiry += 365 days;
        vm.expectRevert(Confiance.OWNER_ONLY.selector);
        vm.prank(agent);
        account.updatePolicy(agent, p);
    }

    function testAgentCannotConfigureReporter() public {
        vm.expectRevert(Confiance.OWNER_ONLY.selector);
        vm.prank(agent);
        account.configureReporter(Confiance.Reporter(address(forwarder), WORKFLOW, agent));
    }

    function testAgentCannotBecomeOwner() public {
        vm.prank(agent);
        (bool success,) = address(account).call(abi.encodeWithSignature("transferOwnership(address)", agent));
        require(!success && account.owner() == owner);
    }

    function testPolicyUpdatePreservesSpendingAndInvalidatesQueuedRequest() public {
        pay(30e6, 0);
        Confiance.Policy memory p = policy();
        p.spendingLimit = 60e6;
        vm.prank(owner);
        account.updatePolicy(agent, p);
        require(account.getSession(agent).spent == 30e6);
        expectPaymentError(Confiance.INVALID_GENERATION.selector, 1e6, 1);
        vm.prank(agent);
        account.executePayment(david, address(token), 30e6, 1, 2);
        require(account.getSession(agent).spent == 60e6);
    }

    function testCannotLowerLimitBelowSpent() public {
        pay(30e6, 0);
        Confiance.Policy memory p = policy();
        p.spendingLimit = 20e6;
        vm.expectRevert(Confiance.INVALID_POLICY.selector);
        vm.prank(owner);
        account.updatePolicy(agent, p);
    }

    function testCannotChangeAssetInExistingBudget() public {
        Confiance.Policy memory p = policy();
        p.allowedAsset = address(new DemoToken(owner));
        vm.expectRevert(Confiance.INVALID_POLICY.selector);
        vm.prank(owner);
        account.updatePolicy(agent, p);
    }

    function testCannotResetActiveBudget() public {
        Confiance.Policy memory p = policy();
        vm.expectRevert(Confiance.SESSION_ALREADY_ACTIVE.selector);
        vm.prank(owner);
        account.createSession(agent, p);
    }

    function testRenewalKeepsNonceAndRejectsOldGeneration() public {
        pay(30e6, 0);
        vm.prank(owner);
        account.revokeSession(agent);
        Confiance.Policy memory p = policy();
        vm.prank(owner);
        account.createSession(agent, p);
        require(account.nonces(agent) == 1 && account.getSession(agent).spent == 0);
        expectPaymentError(Confiance.INVALID_GENERATION.selector, 1e6, 1);
        vm.expectRevert(Confiance.INVALID_NONCE.selector);
        vm.prank(agent);
        account.executePayment(david, address(token), 1e6, 0, 2);
    }

    function testPolicyEditDoesNotReactivateRevokedSession() public {
        vm.prank(owner);
        account.revokeSession(agent);
        Confiance.Policy memory p = policy();
        vm.expectRevert(Confiance.SESSION_REVOKED.selector);
        vm.prank(owner);
        account.updatePolicy(agent, p);
    }

    function testWrongAssetFails() public {
        vm.expectRevert(Confiance.ASSET_NOT_ALLOWED.selector);
        vm.prank(agent);
        account.executePayment(david, address(1), 30e6, 0, 1);
    }

    function testWrongRecipientFails() public {
        vm.expectRevert(Confiance.RECIPIENT_NOT_ELIGIBLE.selector);
        vm.prank(agent);
        account.executePayment(owner, address(token), 30e6, 0, 1);
    }

    function testInvalidPolicyFails() public {
        Confiance.Policy memory p = policy();
        p.allowedAsset = address(123);
        vm.expectRevert(Confiance.INVALID_POLICY.selector);
        vm.prank(owner);
        account.updatePolicy(agent, p);
    }

    function conditionPolicy() private {
        Confiance.Policy memory p = policy();
        p.requiredCondition = CONDITION;
        vm.prank(owner);
        account.updatePolicy(agent, p);
    }

    function testUnverifiedConditionFailsAndVerifiedSucceeds() public {
        conditionPolicy();
        vm.expectRevert(Confiance.CONDITION_NOT_VERIFIED.selector);
        vm.prank(agent);
        account.executePayment(david, address(token), 30e6, 0, 2);
        verify(metadata(), report());
        vm.prank(agent);
        account.executePayment(david, address(token), 30e6, 0, 2);
        require(account.verifiedConditions(CONDITION) && token.balanceOf(david) == 30e6);
    }

    function testOwnerCannotDirectlyVerify() public {
        bytes memory m = metadata();
        bytes memory r = report();
        vm.expectRevert(Confiance.UNAUTHORIZED_REPORT.selector);
        vm.prank(owner);
        account.onReport(m, r);
    }

    function testAgentCannotDirectlyVerify() public {
        bytes memory m = metadata();
        bytes memory r = report();
        vm.expectRevert(Confiance.UNAUTHORIZED_REPORT.selector);
        vm.prank(agent);
        account.onReport(m, r);
    }

    function testWrongWorkflowFails() public {
        bytes memory r = report();
        vm.expectRevert(Confiance.UNAUTHORIZED_REPORT.selector);
        verify(abi.encodePacked(bytes32(0), WORKFLOW_NAME, owner), r);
    }

    function testWrongWorkflowOwnerFails() public {
        bytes memory r = report();
        vm.expectRevert(Confiance.UNAUTHORIZED_REPORT.selector);
        verify(abi.encodePacked(WORKFLOW, WORKFLOW_NAME, agent), r);
    }

    function testMalformedMetadataFails() public {
        bytes memory r = report();
        vm.expectRevert(Confiance.INVALID_REPORT.selector);
        verify(hex"00", r);
    }

    function testPacked62ByteMetadataSupported() public {
        verify(abi.encodePacked(WORKFLOW, WORKFLOW_NAME, owner), report());
        require(account.verifiedConditions(CONDITION));
    }

    function testCrossChainReportFails() public {
        bytes memory m = metadata();
        vm.expectRevert(Confiance.INVALID_REPORT.selector);
        verify(m, abi.encode(uint256(10143), address(account), CONDITION, keccak256("evidence")));
    }

    function testCrossAccountReportFails() public {
        bytes memory m = metadata();
        vm.expectRevert(Confiance.INVALID_REPORT.selector);
        verify(m, abi.encode(block.chainid, address(123), CONDITION, keccak256("evidence")));
    }

    function testReportReplayFails() public {
        bytes memory m = metadata();
        bytes memory r = report();
        verify(m, r);
        vm.expectRevert(Confiance.CONDITION_ALREADY_VERIFIED.selector);
        verify(m, r);
    }

    function testReporterCannotBeAnEOA() public {
        vm.expectRevert(Confiance.INVALID_POLICY.selector);
        vm.prank(owner);
        account.configureReporter(Confiance.Reporter(agent, WORKFLOW, owner));
    }

    function testERC165ReceiverSupport() public view {
        require(account.supportsInterface(account.onReport.selector));
        require(account.supportsInterface(0x01ffc9a7));
        require(!account.supportsInterface(0xffffffff));
    }

    function compliancePolicy() private {
        Confiance.Policy memory p = policy();
        p.complianceAdapter = address(compliance);
        vm.prank(owner);
        account.updatePolicy(agent, p);
    }

    function testEligibleRecipientSucceeds() public {
        compliancePolicy();
        vm.prank(agent);
        account.executePayment(david, address(token), 30e6, 0, 2);
    }

    function testIneligibleRecipientFails() public {
        compliancePolicy();
        compliance.set(false, true, false);
        vm.expectRevert(Confiance.RECIPIENT_NOT_ELIGIBLE.selector);
        vm.prank(agent);
        account.executePayment(david, address(token), 30e6, 0, 2);
    }

    function testIneligibleAssetFails() public {
        compliancePolicy();
        compliance.set(true, false, false);
        vm.expectRevert(Confiance.ASSET_NOT_ALLOWED.selector);
        vm.prank(agent);
        account.executePayment(david, address(token), 30e6, 0, 2);
    }

    function testAdapterFailureFailsClosed() public {
        compliancePolicy();
        compliance.set(true, true, true);
        vm.expectRevert();
        vm.prank(agent);
        account.executePayment(david, address(token), 30e6, 0, 2);
        require(account.nonces(agent) == 0 && account.getSession(agent).spent == 0);
    }

    function testInsufficientFundsRollsBackNonceAndSpent() public {
        uint256 balance = token.balanceOf(address(account));
        vm.prank(address(account));
        require(token.transfer(owner, balance));
        vm.expectRevert();
        pay(30e6, 0);
        require(account.nonces(agent) == 0 && account.getSession(agent).spent == 0);
    }

    function testFeeTokenFailsClosed() public {
        Confiance other = new Confiance(owner);
        FeeToken fee = new FeeToken(address(other));
        Confiance.Policy memory p = policy();
        p.allowedAsset = address(fee);
        vm.startPrank(owner);
        other.registerAgent(agent, keccak256("fee-test"));
        other.createSession(agent, p);
        vm.stopPrank();
        vm.expectRevert(Confiance.UNSUPPORTED_TOKEN_BEHAVIOR.selector);
        vm.prank(agent);
        other.executePayment(david, address(fee), 30e6, 0, 1);
        require(fee.balanceOf(david) == 0 && other.nonces(agent) == 0);
    }

    function testReentrancyBlockedEvenWhenTokenIsAuthorizedAgent() public {
        ReentrantAgentToken malicious = new ReentrantAgentToken();
        malicious.setup(account, david);
        Confiance.Policy memory p = policy();
        p.allowedAsset = address(malicious);
        vm.startPrank(owner);
        account.registerAgent(address(malicious), keccak256("reentry-test"));
        account.createSession(address(malicious), p);
        vm.stopPrank();
        malicious.pay();
        require(malicious.callbackBlocked() && account.getSession(address(malicious)).spent == 30e6);
    }

    function testFuzzSpendingInvariant(uint128 first, uint128 second) public {
        uint256 a = uint256(first) % 50e6 + 1;
        uint256 b = uint256(second) % 50e6 + 1;
        pay(a, 0);
        if (b > 50e6 - a) expectPaymentError(Confiance.SESSION_SPENDING_LIMIT.selector, b, 1);
        else pay(b, 1);
        require(account.getSession(agent).spent <= 50e6);
        require(token.balanceOf(david) == account.getSession(agent).spent);
    }
}
