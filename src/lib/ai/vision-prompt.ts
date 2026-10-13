import type { AnalysisKind, BoardAnalysis } from "./types";

export const VISION_SYSTEM_PROMPT: string = `You analyze snapshots of a whiteboard used for teaching (handwritten notes, formulas, drawings, diagrams). Identify what is written/drawn and respond with STRICT JSON only, matching: {kind: one of formula|equation|graph|molecule|physics|text|unknown, title: short title IN UZBEK (latin), description: 1-3 sentence explanation IN UZBEK, latex?: LaTeX source if a formula/equation, expression?: plottable JS function of x if the content is a function (use ^ for powers, e.g. "x^2 - 3*x + 1"; NEVER include "y=" or "f(x)="), equation?: equation string with '=' if an equation to solve (variable x), molecule?: chemical formula like "H2O" if a molecule is drawn/written, params?: numbers for physics (e.g. {v0: 20, angle: 45}), confidence: 0..1}. If content is plain text, kind=text and put the transcription into description. Provide expression ONLY when it can be plotted as y=f(x).`;

const ALLOWED_KINDS: readonly AnalysisKind[] = [
  "formula",
  "equation",
  "graph",
  "molecule",
  "physics",
  "text",
  "unknown",
];

export function coerceExpression(expr: string): string {
  return expr
    .trim()
    .replace(/^(y\s*=\s*|f\s*\(\s*x\s*\)\s*=\s*)/i, "")
    .trim();
}

export function parseAnalysis(raw: string): BoardAnalysis | null {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) {
    text = fence[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const rec = parsed as Record<string, unknown>;

  const kind: AnalysisKind = ALLOWED_KINDS.includes(rec.kind as AnalysisKind)
    ? (rec.kind as AnalysisKind)
    : "unknown";

  const rawConfidence =
    typeof rec.confidence === "number" ? rec.confidence : Number(rec.confidence);
  const confidence = Number.isFinite(rawConfidence)
    ? Math.min(1, Math.max(0, rawConfidence))
    : 0.5;

  const title = typeof rec.title === "string" ? rec.title : "Tahlil";
  const description = typeof rec.description === "string" ? rec.description : "";

  const analysis: BoardAnalysis = { kind, title, description, confidence };

  if (typeof rec.latex === "string") analysis.latex = rec.latex;
  if (typeof rec.expression === "string") analysis.expression = rec.expression;
  if (typeof rec.equation === "string") analysis.equation = rec.equation;
  if (typeof rec.molecule === "string") analysis.molecule = rec.molecule;

  if (rec.params && typeof rec.params === "object" && !Array.isArray(rec.params)) {
    const params: Record<string, number> = {};
    for (const [key, value] of Object.entries(rec.params)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        params[key] = value;
      }
    }
    if (Object.keys(params).length > 0) analysis.params = params;
  }

  return analysis;
}
