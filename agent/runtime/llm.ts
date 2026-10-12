import { required } from "../../packages/shared/config.js";
import { toolDefinitions, type ToolName } from "../tools/payroll.js";
import { payrollPrompt } from "../prompts/payroll.js";
import { runVertexPayroll } from "./vertex.js";

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid LLM response.");
  return value as Record<string, unknown>;
}
export function parseAssistant(
  value: unknown,
): Extract<Message, { role: "assistant" }> {
  const response = object(value);
  if (!Array.isArray(response.choices))
    throw new Error("No LLM choices returned.");
  const message = object(object(response.choices[0]).message);
  if (message.content !== null && typeof message.content !== "string")
    throw new Error("Invalid LLM content.");
  const calls: ToolCall[] = [];
  if (message.tool_calls !== undefined) {
    if (!Array.isArray(message.tool_calls) || message.tool_calls.length > 6)
      throw new Error("Invalid LLM tool calls.");
    for (const item of message.tool_calls) {
      const call = object(item);
      const fn = object(call.function);
      if (
        call.type !== "function" ||
        typeof call.id !== "string" ||
        typeof fn.name !== "string" ||
        typeof fn.arguments !== "string"
      )
        throw new Error("Malformed tool call.");
      calls.push({
        id: call.id,
        type: "function",
        function: { name: fn.name, arguments: fn.arguments },
      });
    }
  }
  return {
    role: "assistant",
    content: message.content,
    ...(calls.length ? { tool_calls: calls } : {}),
  };
}

/** Provider must support the documented OpenAI-compatible chat-completions/tool format. */
export async function runPayroll(
  env: NodeJS.ProcessEnv,
  dispatch: (name: string, args: string) => Promise<string>,
) {
  if (env.LLM_PROVIDER === "vertex") return runVertexPayroll(env, dispatch);
  if (env.LLM_PROVIDER && env.LLM_PROVIDER !== "chat-completions")
    throw new Error("Unsupported LLM provider.");
  const base = new URL(required(env, "LLM_BASE_URL"));
  if (base.protocol !== "https:")
    throw new Error("LLM endpoint must use HTTPS.");
  const endpoint = `${base.toString().replace(/\/$/, "")}/chat/completions`;
  const messages: Message[] = [
    { role: "system", content: payrollPrompt },
    {
      role: "user",
      content:
        "Inspect the configured payroll task now. Pay only if GitHub is merged and the required onchain CRE condition is verified. Otherwise report why you are waiting.",
    },
  ];
  const transcript: {
    kind: "reasoning" | "tool";
    name?: string;
    content: string;
  }[] = [];
  for (let turn = 0; turn < 12; turn++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${required(env, "LLM_API_KEY")}`,
      },
      body: JSON.stringify({
        model: required(env, "LLM_MODEL"),
        messages,
        tools: toolDefinitions,
        tool_choice: "auto",
        parallel_tool_calls: false,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error("LLM provider call failed.");
    const assistant = parseAssistant(await response.json());
    messages.push(assistant);
    if (assistant.content)
      transcript.push({ kind: "reasoning", content: assistant.content });
    if (!assistant.tool_calls?.length) return transcript;
    for (const call of assistant.tool_calls) {
      const result = await dispatch(
        call.function.name,
        call.function.arguments,
      );
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
      transcript.push({
        kind: "tool",
        name: call.function.name,
        content: result,
      });
    }
  }
  throw new Error(
    "Agent tool-turn limit reached; execution must be reconciled before rerunning.",
  );
}

export function validateToolCall(name: string, args: string): ToolName {
  if (!toolDefinitions.some((tool) => tool.function.name === name))
    throw new Error("Unknown payroll tool.");
  const params = object(JSON.parse(args));
  if (Object.keys(params).length !== 0)
    throw new Error("Payroll tools do not accept overrides.");
  return name as ToolName;
}
