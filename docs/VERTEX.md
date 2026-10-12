# Vertex AI Payroll Agent

Confiance now selects `LLM_PROVIDER=vertex` locally. The adapter follows
[verith-be's Vertex provider](https://github.com/samscript18/verith-be/blob/main/src/api/ai/providers/vertex.provider.ts):
Google OAuth with `google-auth-library`, global/regional Vertex endpoints and
native `generateContent`. It adds the real multi-turn function-tool protocol.
No Mistral fallback is used when Vertex is selected.

Gemini 2.5 Flash (the reference repository's sample Vertex model) retires on
2026-10-20. The selected current model is documented GA Gemini 3.8 Flash, which
supports native function calling at `global`. Project-specific access still needs
a successful authenticated inference request.

```dotenv
LLM_PROVIDER=vertex
VERTEX_PROJECT_ID=verith-ai
VERTEX_LOCATION=global
LLM_MODEL=gemini-3.8-flash
```

Enable billing and the Vertex AI API for `verith-ai`, and grant the chosen identity
the required Vertex AI permissions (typically Vertex AI User). Choose one auth path:

1. **Application Default Credentials:** install Google Cloud CLI, then run
   `gcloud auth application-default login` and configure its quota project with
   `gcloud auth application-default set-quota-project verith-ai`.
2. **Existing service-account file:** set `GOOGLE_APPLICATION_CREDENTIALS` to an
   absolute path to the authorized JSON file. Keep it outside Git or in ignored
   `credentials/`. Do not put its contents into chat.
3. **Existing deployment secret:** `VERTEX_CREDENTIALS_JSON` accepts service-account
   JSON in a server-side secret/environment. Do not commit it. This matches the
   optional JSON credential approach used in verith-be.

The project ID is not an authentication credential. No ADC file or configured
Google credential was found here, and the live Vertex readiness run failed at
authentication. Gemini inference/model access is therefore still unverified.

The Google OAuth library refreshes tokens; no short-lived access token is stored
in `.env`. The runtime preserves opaque thought signatures across function turns,
validates all tool names and empty inputs, rejects blocked/truncated responses,
and executes tools sequentially. Onchain authorization remains Confiance's job.

References:
[Google authentication](https://cloud.google.com/docs/authentication/application-default-credentials),
[Vertex function calling](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling).
