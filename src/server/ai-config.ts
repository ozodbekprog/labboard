import { eq } from "drizzle-orm";
import { db, settings } from "@/db";

export interface AiConfig {
  baseUrl: string;
  key: string;
  model: string;
  visionModel: string;
}

/** User's own key if saved, else env (AI_API_KEY etc.), else null. */
export async function getAiConfig(
  userId: string | null,
): Promise<AiConfig | null> {
  if (userId) {
    const row = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .get();
    if (row?.aiKey && row?.aiModel) {
      return {
        baseUrl: row.aiBaseUrl || process.env.AI_BASE_URL || "https://api.openai.com/v1",
        key: row.aiKey,
        model: row.aiModel,
        visionModel: row.aiVisionModel || row.aiModel,
      };
    }
  }
  const { AI_API_KEY, AI_BASE_URL, AI_MODEL, AI_VISION_MODEL } = process.env;
  if (AI_API_KEY && AI_MODEL) {
    return {
      baseUrl: AI_BASE_URL || "https://api.openai.com/v1",
      key: AI_API_KEY,
      model: AI_MODEL,
      visionModel: AI_VISION_MODEL || AI_MODEL,
    };
  }
  return null;
}
