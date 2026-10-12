import { indexer } from "envio";
const options = {
  fields: { transaction: ["hash"] as const, block: ["timestamp"] as const },
};
indexer.onEvent(
  { contract: "Confiance", event: "AgentRegistered", ...options },
  async ({ event, context }) => {
    context.Activity.set({
      id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
      chainId: event.chainId,
      account: event.srcAddress.toLowerCase(),
      kind: "AgentRegistered",
      hash: event.transaction.hash,
      block: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
      agent: event.params.agent.toLowerCase(),
      recipient: undefined,
      asset: undefined,
      amount: undefined,
      generation: undefined,
      condition: undefined,
    });
  },
);
indexer.onEvent(
  { contract: "Confiance", event: "SessionCreated", ...options },
  async ({ event, context }) => {
    context.Activity.set({
      id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
      chainId: event.chainId,
      account: event.srcAddress.toLowerCase(),
      kind: "SessionCreated",
      hash: event.transaction.hash,
      block: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
      agent: event.params.agent.toLowerCase(),
      recipient: event.params.policy.allowedRecipient.toLowerCase(),
      asset: event.params.policy.allowedAsset.toLowerCase(),
      amount: event.params.policy.spendingLimit,
      generation: event.params.generation,
      condition: event.params.policy.requiredCondition,
    });
  },
);
indexer.onEvent(
  { contract: "Confiance", event: "PolicyUpdated", ...options },
  async ({ event, context }) => {
    context.Activity.set({
      id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
      chainId: event.chainId,
      account: event.srcAddress.toLowerCase(),
      kind: "PolicyUpdated",
      hash: event.transaction.hash,
      block: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
      agent: event.params.agent.toLowerCase(),
      recipient: event.params.policy.allowedRecipient.toLowerCase(),
      asset: event.params.policy.allowedAsset.toLowerCase(),
      amount: event.params.policy.spendingLimit,
      generation: event.params.generation,
      condition: event.params.policy.requiredCondition,
    });
  },
);
indexer.onEvent(
  { contract: "Confiance", event: "SessionRevoked", ...options },
  async ({ event, context }) => {
    context.Activity.set({
      id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
      chainId: event.chainId,
      account: event.srcAddress.toLowerCase(),
      kind: "SessionRevoked",
      hash: event.transaction.hash,
      block: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
      agent: event.params.agent.toLowerCase(),
      recipient: undefined,
      asset: undefined,
      amount: undefined,
      generation: event.params.generation,
      condition: undefined,
    });
  },
);
for (const name of ["PaymentRequested", "PaymentExecuted"] as const)
  indexer.onEvent(
    { contract: "Confiance", event: name, ...options },
    async ({ event, context }) => {
      context.Activity.set({
        id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
        chainId: event.chainId,
        account: event.srcAddress.toLowerCase(),
        kind: name,
        hash: event.transaction.hash,
        block: BigInt(event.block.number),
        timestamp: BigInt(event.block.timestamp),
        agent: event.params.agent.toLowerCase(),
        recipient: event.params.recipient.toLowerCase(),
        asset: event.params.asset.toLowerCase(),
        amount: event.params.amount,
        generation: event.params.generation,
        condition: undefined,
      });
    },
  );
indexer.onEvent(
  { contract: "Confiance", event: "ConditionVerified", ...options },
  async ({ event, context }) => {
    context.Activity.set({
      id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
      chainId: event.chainId,
      account: event.srcAddress.toLowerCase(),
      kind: "ConditionVerified",
      hash: event.transaction.hash,
      block: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
      agent: undefined,
      recipient: undefined,
      asset: undefined,
      amount: undefined,
      generation: undefined,
      condition: event.params.condition,
    });
  },
);
indexer.onEvent(
  { contract: "Confiance", event: "ReporterConfigured", ...options },
  async ({ event, context }) => {
    context.Activity.set({
      id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
      chainId: event.chainId,
      account: event.srcAddress.toLowerCase(),
      kind: "ReporterConfigured",
      hash: event.transaction.hash,
      block: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
      agent: undefined,
      recipient: undefined,
      asset: undefined,
      amount: undefined,
      generation: undefined,
      condition: undefined,
    });
  },
);
