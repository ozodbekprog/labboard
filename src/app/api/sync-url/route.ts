export const dynamic = "force-dynamic";
export async function GET() {
  const url = process.env.SYNC_URL ?? process.env.NEXT_PUBLIC_SYNC_URL ?? "ws://localhost:5858";
  return Response.json({ url });
}
