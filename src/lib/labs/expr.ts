/** Xavfsiz matematik ifoda kompilyatori (eval ishlatilmaydi).
 *  Qo'llab-quvvatlaydi: + - * / % ^ ( ), o'zgaruvchi x, konstantalar pi/e,
 *  funksiyalar: sin cos tan asin acos atan sinh cosh tanh sqrt cbrt abs ln log log2 exp floor ceil round sign.
 *  "2x", "3(x+1)", "2sin(x)" kabi yopiq ko'paytirish ishlaydi.
 */
export function compileExpression(src: string): (x: number) => number {
  const s = src.toLowerCase().replace(/\s+/g, "");
  let pos = 0;

  const peek = () => s[pos];
  const isDigit = (c: string | undefined) => c !== undefined && c >= "0" && c <= "9";
  const isLetter = (c: string | undefined) => c !== undefined && /[a-z]/.test(c);

  const FUNCS: Record<string, (v: number) => number> = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    ln: Math.log,
    log: Math.log10,
    log2: Math.log2,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    sign: Math.sign,
  };

  function parseExpr(): (x: number) => number {
    let fn = parseTerm();
    for (;;) {
      const c = peek();
      if (c === "+" || c === "-") {
        pos++;
        const left = fn;
        const right = parseTerm();
        fn = c === "+" ? (x) => left(x) + right(x) : (x) => left(x) - right(x);
      } else break;
    }
    return fn;
  }

  function startsPrimary(c: string | undefined): boolean {
    return isDigit(c) || isLetter(c) || c === "(";
  }

  function parseTerm(): (x: number) => number {
    let fn = parseUnary();
    for (;;) {
      const c = peek();
      if (c === "*" || c === "/" || c === "%") {
        pos++;
        const left = fn;
        const right = parseUnary();
        fn =
          c === "*"
            ? (x) => left(x) * right(x)
            : c === "/"
              ? (x) => left(x) / right(x)
              : (x) => left(x) % right(x);
      } else if (startsPrimary(c)) {
        // yopiq ko'paytirish: 2x, 3(x+1), 2sin(x)
        const left = fn;
        const right = parseUnary();
        fn = (x) => left(x) * right(x);
      } else break;
    }
    return fn;
  }

  function parseUnary(): (x: number) => number {
    const c = peek();
    if (c === "-") {
      pos++;
      const f = parseUnary();
      return (x) => -f(x);
    }
    if (c === "+") {
      pos++;
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower(): (x: number) => number {
    const base = parsePrimary();
    if (peek() === "^") {
      pos++;
      const exp = parseUnary(); // o'ng assotsiativ, 2^-1 ishlaydi
      return (x) => Math.pow(base(x), exp(x));
    }
    return base;
  }

  function parsePrimary(): (x: number) => number {
    const c = peek();
    if (c === "(") {
      pos++;
      const inner = parseExpr();
      if (peek() !== ")") throw new Error("Qavs yopilmagan");
      pos++;
      return inner;
    }
    if (isDigit(c) || c === ".") {
      let numStr = "";
      while (isDigit(peek()) || peek() === ".") numStr += s[pos++];
      const v = parseFloat(numStr);
      if (isNaN(v)) throw new Error("Noto'g'ri son");
      return () => v;
    }
    if (isLetter(c)) {
      let ident = "";
      while (isLetter(peek()) || isDigit(peek())) ident += s[pos++];
      if (ident === "x") return (x) => x;
      if (ident === "pi") return () => Math.PI;
      if (ident === "e") return () => Math.E;
      if (ident === "tau") return () => Math.PI * 2;
      const fn = FUNCS[ident];
      if (!fn) throw new Error(`Noma'lum funksiya: ${ident}`);
      if (peek() !== "(") throw new Error(`${ident} uchun qavs kerak`);
      pos++;
      const arg = parseExpr();
      if (peek() !== ")") throw new Error("Qavs yopilmagan");
      pos++;
      return (x) => fn(arg(x));
    }
    throw new Error("Ifoda noto'g'ri");
  }

  const compiled = parseExpr();
  if (pos < s.length) throw new Error("Ortiqcha belgi: " + s.slice(pos, pos + 8));
  return (x: number) => {
    const v = compiled(x);
    return typeof v === "number" && isFinite(v) ? v : NaN;
  };
}
