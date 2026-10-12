export const appPages = {
  overview: {
    title: "Overview",
    description: "Your agent’s authority, funds, and current task at a glance.",
    next: "account",
  },
  account: {
    title: "Your account",
    description: "Sign in, connect your Confiance account, and add funds.",
    next: "agent",
  },
  agent: {
    title: "Payroll Agent",
    description:
      "Manage the agent’s separate wallet and identity, and review its work.",
    next: "policy",
  },
  policy: {
    title: "Spending rules",
    description:
      "Choose who the agent can pay, its total allowance, and how long permission lasts.",
    next: "milestone",
  },
  milestone: {
    title: "Required milestone",
    description:
      "Follow the contractor’s work and its independent verification before payment.",
    next: "overview",
  },
  activity: {
    title: "Activity",
    description:
      "Real account events and payment receipts, with transaction links.",
    next: "overview",
  },
  security: {
    title: "Test the boundaries",
    description:
      "Demonstrate spending limits, recipient restrictions, and revoked access with the agent’s own signer.",
    next: "activity",
  },
  connections: {
    title: "Connections",
    description:
      "Review integration readiness and approve the service that verifies milestones.",
    next: "milestone",
  },
} as const;
export type AppSection = keyof typeof appPages;
export function isAppSection(value: string): value is AppSection {
  return Object.hasOwn(appPages, value);
}
