import test from "node:test";
import assert from "node:assert/strict";
import {
  parseVertexResponse,
  vertexEndpoint,
} from "../agent/runtime/vertex.js";
test("Vertex endpoints bind project, region and Gemini model without arbitrary hosts", () => {
  const env = {
    VERTEX_PROJECT_ID: "verith-ai",
    VERTEX_LOCATION: "global",
    LLM_MODEL: "gemini-2.5-flash",
  };
  assert.equal(
    vertexEndpoint(env),
    "https://aiplatform.googleapis.com/v1/projects/verith-ai/locations/global/publishers/google/models/gemini-2.5-flash:generateContent",
  );
  assert.ok(
    vertexEndpoint({ ...env, VERTEX_LOCATION: "us-central1" }).startsWith(
      "https://us-central1-aiplatform.googleapis.com/",
    ),
  );
  assert.throws(() =>
    vertexEndpoint({ ...env, VERTEX_LOCATION: "evil.example/" }),
  );
  assert.throws(() => vertexEndpoint({ ...env, LLM_MODEL: "../other" }));
});
test("Vertex retains thought signatures but excludes hidden thoughts from visible output", () => {
  const value = {
    candidates: [
      {
        finishReason: "STOP",
        content: {
          role: "model",
          parts: [
            { thought: true, text: "hidden" },
            { text: "Waiting for milestone." },
            {
              thoughtSignature: "opaque-signature",
              functionCall: { name: "check_github_milestone", args: {} },
            },
          ],
        },
      },
    ],
  };
  const result = parseVertexResponse(value);
  assert.equal(result.text, "Waiting for milestone.");
  assert.equal(result.content.parts[2]?.thoughtSignature, "opaque-signature");
  assert.deepEqual(result.calls, [
    { name: "check_github_milestone", args: "{}" },
  ]);
});
test("Vertex rejects privileged tool inputs and blocked or truncated responses", () => {
  const wrap = (name: string, args: unknown, finishReason = "STOP") => ({
    candidates: [
      {
        finishReason,
        content: { role: "model", parts: [{ functionCall: { name, args } }] },
      },
    ],
  });
  assert.throws(
    () => parseVertexResponse(wrap("request_payment", { amount: 500 })),
    /overrides/,
  );
  assert.throws(() => parseVertexResponse(wrap("set_policy", {})), /Unknown/);
  assert.throws(
    () => parseVertexResponse(wrap("request_payment", {}, "MAX_TOKENS")),
    /incomplete/,
  );
  assert.throws(() => parseVertexResponse({ candidates: [] }), /candidate/);
});
