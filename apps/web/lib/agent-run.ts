import { blockedPayment } from "./feedback.js";

export interface RunRow {
  kind: string;
  name?: string;
  content: string;
}
export type CheckTone = "success" | "warning" | "neutral";
export function runData(row: RunRow): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(row.content);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
export function paymentProof(rows: RunRow[]) {
  for (const row of [...rows].reverse()) {
    if (
      row.kind !== "tool" ||
      !["request_payment", "task_receipt"].includes(row.name || "")
    )
      continue;
    const data = runData(row);
    if (
      typeof data.transactionHash === "string" &&
      /^0x[0-9a-f]{64}$/i.test(data.transactionHash)
    )
      return {
        data,
        row,
        hash: data.transactionHash,
        confirmed:
          (row.name === "request_payment" && data.status === "executed") ||
          (row.name === "task_receipt" && data.status === "already_paid"),
      };
  }
  return undefined;
}
export function runCheck(row: RunRow): {
  title: string;
  label: string;
  message: string;
  tone: CheckTone;
} {
  const d = runData(row);
  const text = (key: string) =>
    typeof d[key] === "string" ? (d[key] as string) : "";
  const result = (
    title: string,
    label: string,
    message: string,
    tone: CheckTone = "neutral",
  ) => ({ title, label, message, tone });
  switch (row.name) {
    case "check_github_milestone":
      return d.merged === true
        ? result(
            "GitHub milestone",
            "Merged",
            "GitHub confirmed that the pull request was merged.",
            "success",
          )
        : d.merged === false
          ? result(
              "GitHub milestone",
              "Waiting",
              "The pull request has not been merged yet.",
              "warning",
            )
          : result(
              "GitHub milestone",
              "Unavailable",
              "The direct GitHub check was unavailable. Onchain milestone verification is checked separately.",
              "warning",
            );
    case "check_payment_policy": {
      const mismatch =
        typeof d.requiredCondition === "string" &&
        typeof d.expectedCondition === "string" &&
        d.requiredCondition !== d.expectedCondition;
      if (mismatch)
        return result(
          "Spending rules",
          "Needs review",
          "This task refers to a different milestone from the approved policy.",
          "warning",
        );
      const budget = text("spendingLimit");
      if (d.conditionVerified === true)
        return result(
          "Spending rules",
          "Milestone verified",
          `The required milestone is verified onchain.${budget ? ` Total allowance: ${budget} token units.` : ""}`,
          "success",
        );
      if (d.conditionVerified === false)
        return result(
          "Spending rules",
          "Waiting",
          "The required milestone has not been verified onchain.",
          "warning",
        );
      return result(
        "Spending rules",
        "Not confirmed",
        "The payment policy could not be confirmed.",
      );
    }
    case "check_agent_session":
      if (d.exists === false)
        return result(
          "Agent permission",
          "Not authorized",
          "The owner has not authorized a session for this agent.",
          "warning",
        );
      if (d.active === false)
        return result(
          "Agent permission",
          "Revoked",
          "The agent no longer has permission to make payments.",
          "warning",
        );
      if (d.expired === true)
        return result(
          "Agent permission",
          "Expired",
          "The owner must renew the agent’s permission.",
          "warning",
        );
      return d.exists === true && d.active === true && d.expired === false
        ? result(
            "Agent permission",
            "Active",
            "The agent has an active, unexpired spending session.",
            "success",
          )
        : result(
            "Agent permission",
            "Not confirmed",
            "The session could not be confirmed.",
          );
    case "check_recipient":
      if (d.allowedByOwner === true)
        return result(
          "Contractor",
          "Approved",
          "The recipient matches the owner’s approved address. A-Pass eligibility is not established by this check.",
          "success",
        );
      if (d.eligible === true)
        return result(
          "Contractor",
          "Adapter check passed",
          "The configured onchain adapter reported that the recipient is eligible.",
          "success",
        );
      if (d.allowedByOwner === false || d.eligible === false)
        return result(
          "Contractor",
          "Not allowed",
          "The recipient does not meet the session’s recipient rule.",
          "warning",
        );
      return result(
        "Contractor",
        "Not confirmed",
        "The recipient check could not be confirmed.",
      );
    case "check_balance":
      if (d.sufficientTokens === true)
        return result(
          "Treasury funds",
          "Sufficient",
          `${text("treasury") || "Enough"} token units were available for the requested payment.`,
          "success",
        );
      if (d.sufficientTokens === false)
        return result(
          "Treasury funds",
          "Needs funding",
          "The account did not hold enough of the approved token for this payment.",
          "warning",
        );
      return result(
        "Treasury funds",
        "Not confirmed",
        "The treasury balance could not be checked.",
      );
    case "request_payment":
    case "task_receipt": {
      const proof = paymentProof([row]);
      if (proof?.confirmed)
        return result(
          "Payment",
          d.status === "already_paid" ? "Already paid" : "Confirmed",
          d.status === "already_paid"
            ? "The previous payment was verified. No duplicate payment was sent."
            : "The payment tool verified a successful transaction and matching payment event.",
          "success",
        );
      if (d.status === "blocked" || d.status === "reverted")
        return result(
          "Payment",
          d.status === "reverted" ? "Reverted" : "Blocked",
          blockedPayment(text("code")).message,
          "warning",
        );
      if (proof)
        return result(
          "Payment",
          "Unconfirmed",
          "A transaction was submitted; successful settlement is not confirmed.",
          "warning",
        );
      return result(
        "Payment",
        "Not confirmed",
        "No confirmed payment receipt was returned.",
      );
    }
    default:
      return result(
        "Additional check",
        "Recorded",
        "The agent returned additional evidence for this run.",
      );
  }
}
