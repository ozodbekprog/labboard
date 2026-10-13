export type ShapeType = "draw" | "rect" | "ellipse" | "line" | "arrow" | "text" | "image";
export interface ShapeBase { id: string; type: ShapeType; x: number; y: number; w: number; }
export interface DrawShape extends ShapeBase { type: "draw"; color: string; size: number; points: number[]; } // [x0,y0,x1,y1,...] RELATIVE to x,y
export interface GeoShape extends ShapeBase { type: "rect" | "ellipse"; stroke: string; fill: string | null; strokeW: number; }
export interface LineShape extends ShapeBase { type: "line" | "arrow"; stroke: string; strokeW: number; x2: number; y2: number; } // relative end point
export interface TextShape extends ShapeBase { type: "text"; text: string; fontSize: number; color: string; }
export interface ImageShape extends ShapeBase { type: "image"; src: string; }
export type Shape = DrawShape | GeoShape | LineShape | TextShape | ImageShape;

export type BoardOp =
  | { k: "add"; s: Shape }
  | { k: "upd"; id: string; p: Partial<Shape> }
  | { k: "del"; ids: string[] };

export interface BoardDoc { v: 1; shapes: Shape[] }
export interface PresenceUser { id: string; name: string; color: string; x: number; y: number }

let shapeSeq = 0;
export function createShapeId(): string {
  shapeSeq = (shapeSeq + 1) % 1296;
  return "sh_" + shapeSeq.toString(36) + Math.random().toString(36).slice(2, 10);
}
