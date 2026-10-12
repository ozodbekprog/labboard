import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getCurrentUser, newId } from "@/server/auth";

export const runtime = "nodejs";

const MIME_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "invalid_file" }, { status: 400 });
  }

  const ext = MIME_MAP[file.type];
  if (!ext || file.size > MAX_SIZE) {
    return Response.json({ error: "invalid_file" }, { status: 400 });
  }

  const name = `${newId("asset")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  mkdirSync("public/uploads", { recursive: true });
  writeFileSync(path.join("public/uploads", name), buffer);

  return Response.json({ src: `/uploads/${name}` });
}
