import { z } from "zod";
import { getCurrentUser } from "@/server/auth";

const mathSchema = z.object({
  op: z.enum(["evaluate", "simplify", "derivative", "solve"]),
  expression: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = mathSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { op, expression } = parsed.data;

  try {
    const math = await import("mathjs");

    switch (op) {
      case "evaluate": {
        const v = math.evaluate(expression);
        const result =
          typeof v === "number" ? Number(v.toPrecision(10)) : String(v);
        return Response.json({ result });
      }
      case "simplify": {
        return Response.json({ result: math.simplify(expression).toString() });
      }
      case "derivative": {
        return Response.json({
          result: math.derivative(expression, "x").toString(),
        });
      }
      case "solve": {
        const parts = expression.split("=");
        const eq =
          parts.length > 1 ? `(${parts[0]})-(${parts[1]})` : expression;
        const f = (x: number) => {
          const v = math.evaluate(eq, { x });
          return typeof v === "number" ? v : NaN;
        };

        const roots: number[] = [];
        const addRoot = (r: number) => {
          if (!Number.isFinite(r)) return;
          const rounded = Math.round(r * 1e6) / 1e6;
          if (roots.every((p) => Math.abs(p - rounded) >= 1e-4)) {
            roots.push(rounded);
          }
        };

        const step = 0.5;
        let prevX = -200;
        let prevY = f(prevX);
        for (let x = prevX + step; x <= 200; x += step) {
          const y = f(x);
          if (Math.abs(y) < 1e-9) {
            addRoot(x);
          } else if (!Number.isNaN(prevY) && !Number.isNaN(y) && prevY * y < 0) {
            let lo = prevX;
            let hi = x;
            let flo = prevY;
            for (let i = 0; i < 100; i++) {
              const mid = (lo + hi) / 2;
              const fm = f(mid);
              if (Number.isNaN(fm)) break;
              if (Math.abs(fm) < 1e-7 || hi - lo < 1e-7) {
                addRoot(mid);
                break;
              }
              if (flo * fm < 0) {
                hi = mid;
              } else {
                lo = mid;
                flo = fm;
              }
            }
          }
          prevX = x;
          prevY = y;
        }

        roots.sort((a, b) => a - b);
        return Response.json({ roots: roots.slice(0, 20) });
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: "invalid_expression", detail: message.slice(0, 200) },
      { status: 400 },
    );
  }
}
