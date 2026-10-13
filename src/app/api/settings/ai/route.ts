import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, settings } from "@/db";
import { getCurrentUser } from "@/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const row = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, user.id))
    .get();
  if (row?.aiKey && row?.aiModel) {
    return Response.json({
      configured: true,
      source: "user",
      baseUrl: row.aiBaseUrl || "https://api.openai.com/v1",
      model: row.aiModel,
      visionModel: row.aiVisionModel || row.aiModel,
      hasKey: true,
    });
  }

  const { AI_API_KEY, AI_BASE_URL, AI_MODEL, AI_VISION_MODEL } = process.env;
  if (AI_API_KEY && AI_MODEL) {
    return Response.json({
      configured: true,
      source: "env",
      baseUrl: AI_BASE_URL || "https://api.openai.com/v1",
      model: AI_MODEL,
      visionModel: AI_VISION_MODEL || AI_MODEL,
      hasKey: true,
    });
  }

  return Response.json({
    configured: false,
    source: null,
    baseUrl: null,
    model: null,
    visionModel: null,
    hasKey: false,
  });
}

const settingsSchema = z.object({
  baseUrl: z.string().max(300).optional(),
  key: z.string().max(400).optional(),
  model: z.string().max(150).optional(),
  visionModel: z.string().max(150).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = settingsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const { baseUrl, key, model, visionModel } = parsed.data;

  if (key === "") {
    await db.delete(settings).where(eq(settings.userId, user.id)).run();
    return Response.json({ ok: true, reset: true });
  }

  if (!key || !model) {
    return Response.json({ error: "missing_key_or_model" }, { status: 400 });
  }

  const now = Date.now();
  await db
    .insert(settings)
    .values({
      userId: user.id,
      aiBaseUrl: baseUrl ?? null,
      aiKey: key,
      aiModel: model,
      aiVisionModel: visionModel ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: settings.userId,
      set: {
        aiBaseUrl: baseUrl ?? null,
        aiKey: key,
        aiModel: model,
        aiVisionModel: visionModel ?? null,
        updatedAt: now,
      },
    })
    .run();

  return Response.json({ ok: true });
}
