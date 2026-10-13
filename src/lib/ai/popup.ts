export interface PopupData {
  kind: "answer" | "graph" | "equation" | "molecule" | "physics" | "info";
  title: string;
  answer?: string;
  description?: string;
  expression?: string;
  equation?: string;
  molecule?: string;
  params?: Record<string, number>;
}
export interface PopupSuggestion {
  id: string;
  anchorShapeId: string;
  data: PopupData;
}
