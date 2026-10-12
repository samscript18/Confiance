export const appPages = {
  overview: {
    title: "Overview",
    description:
      "Your agent’s authority, funds, milestone and latest payment at a glance.",
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
      "Manage the agent’s wallet, identity and permissions, and review its work.",
    next: "overview",
  },
  activity: {
    title: "Activity",
    description:
      "Real account events and payment receipts, with transaction links.",
    next: "overview",
  },
  settings: {
    title: "Settings",
    description: "Manage milestone verification and compliance integrations.",
    next: "overview",
  },
} as const;
export const legacyAppRoutes = {
  policy: "/app/agent#permissions",
  security: "/app/agent#test-permissions",
  milestone: "/app/overview#milestone",
  connections: "/app/settings",
} as const;
export type AppSection = keyof typeof appPages;
export function isAppSection(value: string): value is AppSection {
  return Object.hasOwn(appPages, value);
}
export function legacyAppRoute(value: string): string | undefined {
  return Object.hasOwn(legacyAppRoutes, value)
    ? legacyAppRoutes[value as keyof typeof legacyAppRoutes]
    : undefined;
}
