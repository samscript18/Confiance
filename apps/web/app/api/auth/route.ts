import { challenge, login, logout, sameOrigin } from "../../../lib/auth";
import { publicResponse } from "../../../lib/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const action = new URL(request.url).searchParams.get("action");
    if (action === "challenge") return publicResponse(challenge());
    if (action === "logout") {
      await logout();
      return publicResponse({ status: "signed_out" });
    }
    await login(await request.json());
    return publicResponse({ status: "authenticated" });
  } catch {
    return publicResponse(
      {
        error:
          "Owner sign-in unavailable. Check CONFIANCE_OWNER and WEB_ORIGIN configuration.",
      },
      401,
    );
  }
}
