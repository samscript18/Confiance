import { GoogleAuth } from "google-auth-library";
import { required } from "../../packages/shared/config.js";
import { toolDefinitions } from "../tools/payroll.js";
import { payrollPrompt } from "../prompts/payroll.js";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Vertex response.");
  return value as Record<string, unknown>;
}
export function vertexEndpoint(env: NodeJS.ProcessEnv) {
  const project = required(env, "VERTEX_PROJECT_ID");
  const location = required(env, "VERTEX_LOCATION");
  const model = required(env, "LLM_MODEL");
  if (
    !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project) ||
    !/^(global|[a-z]+-[a-z0-9]+[0-9])$/.test(location) ||
    !/^gemini-[a-z0-9.-]+$/.test(model)
  )
    throw new Error("Invalid Vertex project, location or Gemini model.");
  const host =
    location === "global"
      ? "aiplatform.googleapis.com"
      : `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
}
export function parseVertexResponse(value: unknown) {
  const root = object(value);
  if (!Array.isArray(root.candidates) || root.candidates.length !== 1)
    throw new Error("Vertex returned no unique candidate.");
  const candidate = object(root.candidates[0]);
  if (candidate.finishReason !== "STOP")
    throw new Error("Vertex response blocked or incomplete.");
  const content = object(candidate.content);
  if (
    content.role !== "model" ||
    !Array.isArray(content.parts) ||
    !content.parts.length
  )
    throw new Error("Invalid Vertex model content.");
  const parts = content.parts.map(object);
  const calls: { name: string; args: string }[] = [];
  for (const part of parts) {
    if (part.functionCall !== undefined) {
      const call = object(part.functionCall);
      if (
        typeof call.name !== "string" ||
        !toolDefinitions.some((t) => t.function.name === call.name)
      )
        throw new Error("Unknown Vertex tool.");
      const args = call.args === undefined ? {} : object(call.args);
      if (Object.keys(args).length)
        throw new Error("Payroll tools do not accept overrides.");
      calls.push({ name: call.name, args: JSON.stringify(args) });
    }
  }
  if (calls.length > 6) throw new Error("Too many Vertex tool calls.");
  return {
    content: { role: "model" as const, parts },
    calls,
    text: parts
      .filter((p) => p.thought !== true && typeof p.text === "string")
      .map((p) => p.text as string)
      .join(""),
  };
}
export async function runVertexPayroll(
  env: NodeJS.ProcessEnv,
  dispatch: (name: string, args: string) => Promise<string>,
) {
  const endpoint = vertexEndpoint(env);
  let credentials:
    | { type: "service_account"; client_email: string; private_key: string }
    | undefined;
  if (env.VERTEX_CREDENTIALS_JSON) {
    const parsed = object(JSON.parse(env.VERTEX_CREDENTIALS_JSON));
    if (
      parsed.type !== "service_account" ||
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    )
      throw new Error("Invalid Vertex service-account credentials.");
    credentials = {
      type: "service_account",
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  }
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    projectId: required(env, "VERTEX_PROJECT_ID"),
    ...(credentials ? { credentials } : {}),
    ...(!credentials && env.GOOGLE_APPLICATION_CREDENTIALS
      ? { keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS }
      : {}),
  });
  const contents: {
    role: "user" | "model";
    parts: Record<string, unknown>[];
  }[] = [
    {
      role: "user",
      parts: [
        {
          text: "Inspect the configured payroll task. Pay only if GitHub is merged and the required onchain CRE condition is verified. Otherwise report why you are waiting.",
        },
      ],
    },
  ];
  const transcript: {
    kind: "reasoning" | "tool";
    name?: string;
    content: string;
  }[] = [];
  for (let turn = 0; turn < 12; turn++) {
    let token: string | null | undefined;
    try {
      token = await auth.getAccessToken();
    } catch {
      throw new Error(
        "Vertex authentication unavailable. Configure Application Default Credentials or a service-account file.",
      );
    }
    if (!token) throw new Error("Vertex authentication returned no token.");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: payrollPrompt }] },
        contents,
        tools: [
          {
            functionDeclarations: toolDefinitions.map((t) => ({
              name: t.function.name,
              description: t.function.description,
            })),
          },
        ],
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        generationConfig: {
          temperature: 1,
          maxOutputTokens: 4096,
          ...(env.LLM_MODEL?.startsWith("gemini-3")
            ? { thinkingConfig: { thinkingLevel: "LOW" } }
            : {}),
        },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new Error(
        `Vertex provider request failed (HTTP ${response.status}).`,
      );
    const result = parseVertexResponse(await response.json());
    // Preserve complete model parts, including opaque thought signatures, for the next turn.
    contents.push(result.content);
    if (result.text)
      transcript.push({ kind: "reasoning", content: result.text });
    if (!result.calls.length) {
      if (!result.text) throw new Error("Vertex returned no usable response.");
      return transcript;
    }
    const responses: Record<string, unknown>[] = [];
    for (const call of result.calls) {
      const output = await dispatch(call.name, call.args);
      responses.push({
        functionResponse: {
          name: call.name,
          response: { result: JSON.parse(output) as unknown },
        },
      });
      transcript.push({ kind: "tool", name: call.name, content: output });
    }
    contents.push({ role: "user", parts: responses });
  }
  throw new Error(
    "Agent tool-turn limit reached; reconcile execution before rerunning.",
  );
}
