import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { VISION_SYSTEM_PROMPT, parseAnalysis } from "@/lib/ai/vision-prompt";

const visionSchema = z.object({
  image: z
    .string()
    .startsWith("data:image/")
    .refine((s) => s.length < 8_000_000),
  hint: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = visionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_image" }, { status: 400 });
  }

  const { image, hint } = parsed.data;
  const { AI_API_KEY, AI_BASE_URL, AI_MODEL } = process.env;
  if (!AI_API_KEY || !AI_MODEL) {
    return Response.json({ error: "ai_not_configured" }, { status: 501 });
  }

  const base = (AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_VISION_MODEL || AI_MODEL;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${AI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Doska surati.${hint ? " Qo'shimcha izoh: " + hint : ""}`,
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return Response.json(
      { error: "upstream_error", detail: body.slice(0, 300) },
      { status: 502 },
    );
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const analysis = parseAnalysis(text);
  if (!analysis) {
    return Response.json(
      { error: "parse_error", raw: text.slice(0, 300) },
      { status: 502 },
    );
  }

  return Response.json({ analysis });
}
