export interface Feedback {
  title: string;
  message: string;
  nextStep?: string;
  tone?: "success" | "info" | "blocked" | "error";
  transactionHash?: string;
}

const actionMessages: Readonly<
  Record<string, { pending: string; errorTitle: string }>
> = {
  "Signing in": {
    pending: "Signing in…",
    errorTitle: "We couldn’t sign you in",
  },
  "Creating owner": {
    pending: "Creating your passkey…",
    errorTitle: "Your passkey wasn’t created",
  },
  "Signing out": {
    pending: "Signing out…",
    errorTitle: "Sign-out needs attention",
  },
  "Deploying Confiance": {
    pending: "Creating your account…",
    errorTitle: "Your account wasn’t created",
  },
  "Deploying test token": {
    pending: "Preparing test funds…",
    errorTitle: "Test funds aren’t ready",
  },
  "Connecting Privy wallet": {
    pending: "Connecting the agent wallet…",
    errorTitle: "The agent wallet isn’t connected",
  },
  "Registering ERC-8004 identity": {
    pending: "Registering Payroll Agent…",
    errorTitle: "Payroll Agent wasn’t registered",
  },
  "Authorizing session": {
    pending: "Authorizing Payroll Agent…",
    errorTitle: "Payroll Agent wasn’t authorized",
  },
  "Updating policy": {
    pending: "Saving your rules…",
    errorTitle: "Your rules weren’t saved",
  },
  "Funding treasury": {
    pending: "Adding funds…",
    errorTitle: "Funds weren’t added",
  },
  "Authorizing CRE reporter": {
    pending: "Enabling milestone verification…",
    errorTitle: "Milestone verification wasn’t enabled",
  },
  "Revoking session": {
    pending: "Revoking permission…",
    errorTitle: "Permission wasn’t revoked",
  },
  "Running Payroll Agent": {
    pending: "The agent is checking the task…",
    errorTitle: "The agent couldn’t finish its check",
  },
  "Testing spending limit": {
    pending: "Testing the spending limit…",
    errorTitle: "The spending test couldn’t finish",
  },
  "Testing milestone condition": {
    pending: "Testing the milestone rule…",
    errorTitle: "The milestone test couldn’t finish",
  },
  "Testing recipient rule": {
    pending: "Testing the recipient rule…",
    errorTitle: "The recipient test couldn’t finish",
  },
  "Retrying with revoked key": {
    pending: "Checking revoked access…",
    errorTitle: "The revocation test couldn’t finish",
  },
};
export function actionCopy(action: string) {
  return (
    actionMessages[action] ?? {
      pending: "Working…",
      errorTitle: "This action needs attention",
    }
  );
}

export function blockedPayment(
  reason: string,
  transactionHash?: string,
): Feedback {
  const descriptions: Readonly<Record<string, string>> = {
    CONDITION_NOT_VERIFIED:
      "The required milestone hasn’t been verified yet. The contractor has not been paid by this request.",
    SESSION_SPENDING_LIMIT:
      "This payment exceeds the agent’s remaining spending allowance. The contractor has not been paid by this request.",
    SESSION_REVOKED:
      "You removed this agent’s permission to spend. Its wallet still exists, but this payment was stopped.",
    SESSION_EXPIRED:
      "The agent’s permission has expired. Authorize a new session before it can pay again.",
    RECIPIENT_NOT_ELIGIBLE:
      "This recipient does not meet the rules you approved. The payment was stopped.",
    ASSET_NOT_ALLOWED:
      "The agent tried to use a token outside its approved rules. The payment was stopped.",
    INVALID_NONCE:
      "This payment request was already used or is out of date. It cannot be used again.",
  };
  return {
    title: "Payment blocked",
    tone: "blocked",
    message:
      descriptions[reason] ??
      "This payment did not complete. Review the request and the agent’s permissions before trying again.",
    ...(reason === "CONDITION_NOT_VERIFIED"
      ? {
          nextStep:
            "Complete the milestone and wait for verification, then let the agent check again.",
        }
      : {}),
    ...(transactionHash ? { transactionHash } : {}),
  };
}

export function payrollFeedback(
  rows: { kind: string; name?: string; content: string }[],
): Feedback {
  for (const row of [...rows].reverse()) {
    if (
      row.kind !== "tool" ||
      !["request_payment", "task_receipt"].includes(row.name ?? "")
    )
      continue;
    let data: unknown;
    try {
      data = JSON.parse(row.content);
    } catch {
      continue;
    }
    if (!data || typeof data !== "object") continue;
    const result = data as Record<string, unknown>;
    const hash =
      typeof result.transactionHash === "string" &&
      /^0x[0-9a-f]{64}$/i.test(result.transactionHash)
        ? result.transactionHash
        : undefined;
    if (hash && result.status === "executed" && row.name === "request_payment")
      return {
        title: "Contractor paid",
        message:
          "Payroll Agent completed the approved payment. The transaction is confirmed, and your remaining allowance has been updated.",
        tone: "success",
        transactionHash: hash,
      };
    if (hash && result.status === "already_paid" && row.name === "task_receipt")
      return {
        title: "This contractor was already paid",
        message:
          "The completed payment has been verified. The agent did not send another payment for this task.",
        tone: "info",
        transactionHash: hash,
      };
    if (result.status === "blocked" || result.status === "reverted")
      return blockedPayment(
        typeof result.code === "string" ? result.code : "",
        hash,
      );
    if (
      hash &&
      ["submitted", "submitted_unverified"].includes(String(result.status))
    )
      return {
        title: "Payment is awaiting confirmation",
        message:
          "The request has been sent, but its result is not confirmed yet. Check the transaction before starting another payment.",
        tone: "info",
        transactionHash: hash,
      };
  }
  const checks = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (row.kind !== "tool" || !row.name?.startsWith("check_")) continue;
    try {
      const value: unknown = JSON.parse(row.content);
      if (value && typeof value === "object")
        checks.set(row.name, value as Record<string, unknown>);
    } catch {
      /* A malformed check cannot establish task state. */
    }
  }
  const session = checks.get("check_agent_session");
  if (
    session?.exists === false ||
    session?.active === false ||
    session?.expired === true
  )
    return {
      title: "The agent needs permission",
      message:
        "Payroll Agent does not have an active spending session for this task. No payment was confirmed.",
      nextStep: "Review its permissions in Account & policy.",
      tone: "info",
    };
  if (checks.get("check_payment_policy")?.conditionVerified === false)
    return {
      title: "Waiting for the milestone",
      message:
        "The required milestone has not been verified yet. Payroll Agent cannot pay until verification is complete.",
      nextStep:
        "Complete the milestone, wait for Verified in Overview, then run the agent again.",
      tone: "info",
    };
  // Model text is never proof that funds moved.
  return {
    title: "Agent check finished",
    message:
      "Payroll Agent reviewed the task. This run has no confirmed payment. You can review its findings below.",
    tone: "info",
  };
}
