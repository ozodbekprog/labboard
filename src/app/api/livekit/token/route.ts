import { AccessToken } from "livekit-server-sdk";
import { getCurrentUser } from "@/server/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room");
  const name = searchParams.get("name");

  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return Response.json({ error: "livekit_not_configured" }, { status: 501 });
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: user.id,
    name: name ?? user.name,
    ttl: "2h",
  });
  at.addGrant({
    roomJoin: true,
    room: room ?? "",
    canPublish: true,
    canSubscribe: true,
  });

  return Response.json({ token: await at.toJwt(), url: LIVEKIT_URL });
}
