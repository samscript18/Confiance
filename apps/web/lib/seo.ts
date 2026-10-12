export const siteUrl = new URL(
  process.env.SITE_URL || "https://confiance-eta.vercel.app",
).origin;

export const siteDescription =
  "Give an AI agent a job without giving it your wallet. Confiance enforces spending limits, verified milestones and revocable payment authority on Monad.";
