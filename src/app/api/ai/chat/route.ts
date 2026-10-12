import { z } from "zod";
import { getCurrentUser } from "@/server/auth";

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  context: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const { AI_API_KEY, AI_BASE_URL, AI_MODEL } = process.env;
  if (!AI_API_KEY || !AI_MODEL) {
    return Response.json({ error: "ai_not_configured" }, { status: 501 });
  }

  const base = (AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const systemPrompt = `Sen LabBoard platformasidagi o'qituvchi yordamchisisan. Javoblarni o'zbek tilida, qisqa va aniq yoz. Kontekst: ${parsed.data.context ?? ""}`;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${AI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...parsed.data.messages,
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: text }, { status: res.status });
  }

  return new Response(res.body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
    },
  });
}
