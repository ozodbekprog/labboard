export type AnalysisKind =
  | "formula" | "equation" | "graph" | "molecule" | "physics" | "text" | "unknown";

export interface BoardAnalysis {
  kind: AnalysisKind;
  title: string;
  description: string;
  latex?: string;
  expression?: string;
  equation?: string;
  molecule?: string;
  params?: Record<string, number>;
  confidence: number;
}
