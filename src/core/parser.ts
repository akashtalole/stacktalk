import { lex, Token } from './lexer';
import { Result, ok, StackTalkError } from './result';
import { BinOp, Expr, Handler, KEYWORDS, PutMode, RepeatKind, Script, Stmt } from './ast';

const MAX_DEPTH = 200;

// Internal only: parse() and parseExpression() catch this and return a Result.
class ParseFail {
  constructor(readonly error: StackTalkError) {}
}

/** Parse a whole script: a list of `on ... end` handlers (R2). Never throws. */
export function parse(src: string): Result<Script> {
  return run(src, (p) => p.script());
}

/** Parse one expression. Handy for tests and the message box. Never throws. */
export function parseExpression(src: string): Result<Expr> {
  return run(src, (p) => {
    const e = p.expr();
    p.expectEnd();
    return e;
  });
}

function run<T>(src: string, f: (p: Parser) => T): Result<T> {
  const toks = lex(src);
  if (!toks.ok) return toks;
  try {
    return ok(f(new Parser(toks.value)));
  } catch (e) {
    if (e instanceof ParseFail) return { ok: false, error: e.error };
    if (e instanceof RangeError) return { ok: false, error: { message: 'Script is too deeply nested', line: 0, col: 0 } };
    throw e;
  }
}

class Parser {
  private i = 0;
  private depth = 0;
  constructor(private readonly toks: Token[]) {}

  // ---- token helpers ----
  private peek(n = 0): Token {
    return this.toks[Math.min(this.i + n, this.toks.length - 1)]!;
  }
  private next(): Token {
    const t = this.peek();
    if (t.kind !== 'eof') this.i++;
    return t;
  }
  private isWord(w: string, n = 0) {
    const t = this.peek(n);
    return t.kind === 'word' && t.text === w;
  }
  private isOp(o: string, n = 0) {
    const t = this.peek(n);
    return t.kind === 'op' && t.text === o;
  }
  private acceptWord(...ws: string[]): string | null {
    const t = this.peek();
    if (t.kind === 'word' && ws.includes(t.text)) { this.i++; return t.text; }
    return null;
  }
  private fail(msg: string, t: Token = this.peek()): never {
    throw new ParseFail({ message: msg, line: t.line, col: t.col });
  }
  private expectWord(w: string, msg = `Expected "${w}"`) {
    if (!this.acceptWord(w)) this.fail(msg);
  }
  private name(what: string): string {
    const t = this.peek();
    if (t.kind !== 'word' || KEYWORDS.has(t.text)) this.fail(`Expected ${what}`);
    this.i++;
    return t.text;
  }
  private atLineEnd() {
    const k = this.peek().kind;
    return k === 'newline' || k === 'eof';
  }
  private skipNewlines() {
    while (this.peek().kind === 'newline') this.i++;
  }
  expectEnd() {
    if (this.peek().kind !== 'eof') this.fail(`Can't understand "${this.peek().text}"`);
  }
  private enter() {
    if (++this.depth > MAX_DEPTH) this.fail('Script is too deeply nested');
  }
  private leave() {
    this.depth--;
  }

  // ---- script and handlers ----
  script(): Script {
    const handlers: Handler[] = [];
    this.skipNewlines();
    while (this.peek().kind !== 'eof') {
      handlers.push(this.handler());
      this.skipNewlines();
    }
    return { handlers };
  }

  private handler(): Handler {
    this.expectWord('on', 'Expected "on" to start a handler');
    const name = this.name('a handler name');
    const params: string[] = [];
    if (!this.atLineEnd()) {
      params.push(this.name('a parameter name'));
      while (this.isOp(',')) { this.next(); params.push(this.name('a parameter name')); }
    }
    if (!this.atLineEnd()) this.fail('Expected end of line');
    const body = this.block();
    this.expectWord('end', `Expected "end ${name}"`);
    const t = this.peek();
    if (t.kind !== 'word' || t.text !== name) this.fail(`Expected "end ${name}"`);
    this.next();
    if (!this.atLineEnd()) this.fail('Expected end of line');
    return { name, params, body };
  }

  /** Statements on their own lines, until `end`, `else` or end of file. */
  private block(): Stmt[] {
    const out: Stmt[] = [];
    for (;;) {
      this.skipNewlines();
      if (this.peek().kind === 'eof' || this.isWord('end') || this.isWord('else')) return out;
      out.push(this.stmt());
      if (!this.atLineEnd()) this.fail('Expected end of line');
    }
  }

  // ---- statements ----
  private stmt(): Stmt {
    this.enter();
    try {
      const t = this.peek();
      if (t.kind !== 'word') this.fail(`Can't understand "${t.text}"`);
      switch (t.text) {
        case 'put': return this.put();
        case 'get': this.next(); return { t: 'get', value: this.expr() };
        case 'go': return this.go();
        case 'answer': this.next(); return { t: 'answer', value: this.expr() };
        case 'pass': this.next(); return { t: 'pass', name: this.name('a message name') };
        case 'if': return this.ifStmt();
        case 'repeat': return this.repeat();
      }
      if (KEYWORDS.has(t.text)) this.fail(`Can't understand "${t.text}" here`);
      this.next();
      const args: Expr[] = [];
      if (!this.atLineEnd() && !this.isWord('else')) {
        args.push(this.expr());
        while (this.isOp(',')) { this.next(); args.push(this.expr()); }
      }
      return { t: 'send', name: t.text, args };
    } finally {
      this.leave();
    }
  }

  private put(): Stmt {
    this.next();
    const value = this.expr();
    const mode = this.acceptWord('into', 'before', 'after') as PutMode | null;
    if (!mode) this.fail('Expected "into", "before" or "after"');
    const target = this.container();
    return { t: 'put', value, mode, target };
  }

  private container(): Expr {
    const t = this.peek();
    const e = this.primary();
    if (e.t !== 'var' && e.t !== 'field') this.fail('Expected a variable or field', t);
    return e;
  }

  private go(): Stmt {
    this.next();
    this.acceptWord('to');
    if (!this.acceptWord('card', 'cd')) this.fail('Expected "card"');
    return { t: 'go', card: this.expr() };
  }

  private ifStmt(): Stmt {
    this.next();
    const cond = this.expr();
    this.skipNewlines(); // `then` may start the next line
    this.expectWord('then');

    let thenPart: Stmt[];
    let multiLine = false;
    if (this.atLineEnd()) {
      multiLine = true;
      thenPart = this.block();
    } else {
      thenPart = [this.stmt()];
      // `else` may follow on the same line or the next one.
      let j = 0;
      while (this.peek(j).kind === 'newline') j++;
      if (this.isWord('else', j)) this.i += j;
    }

    if (this.acceptWord('else')) {
      if (this.atLineEnd()) {
        const elsePart = this.block();
        this.endIf();
        return { t: 'if', cond, then: thenPart, else: elsePart };
      }
      return { t: 'if', cond, then: thenPart, else: [this.stmt()] };
    }
    if (multiLine) this.endIf();
    return { t: 'if', cond, then: thenPart };
  }

  private endIf() {
    this.expectWord('end', 'Expected "end if"');
    this.expectWord('if', 'Expected "end if"');
  }

  private repeat(): Stmt {
    this.next();
    let kind: RepeatKind;
    if (this.atLineEnd() || this.acceptWord('forever')) {
      kind = { k: 'forever' };
    } else if (this.acceptWord('while')) {
      kind = { k: 'while', cond: this.expr() };
    } else if (this.acceptWord('until')) {
      kind = { k: 'until', cond: this.expr() };
    } else if (this.acceptWord('with')) {
      const name = this.name('a loop variable');
      if (!this.isOp('=')) this.fail('Expected "="');
      this.next();
      const from = this.expr();
      const down = this.acceptWord('down') !== null;
      this.expectWord('to');
      kind = { k: 'with', name, from, to: this.expr(), down };
    } else {
      this.acceptWord('for');
      const n = this.expr();
      this.acceptWord('times');
      kind = { k: 'times', n };
    }
    if (!this.atLineEnd()) this.fail('Expected end of line');
    const body = this.block();
    this.expectWord('end', 'Expected "end repeat"');
    this.expectWord('repeat', 'Expected "end repeat"');
    return { t: 'repeat', kind, body };
  }

  // ---- expressions, lowest precedence first ----
  expr(): Expr {
    this.enter();
    try { return this.or(); } finally { this.leave(); }
  }

  private left(nextLevel: () => Expr, ops: (string)[]): Expr {
    let l = nextLevel();
    for (;;) {
      const op = this.binOp(ops);
      if (!op) return l;
      l = { t: 'bin', op, l, r: nextLevel() };
    }
  }

  /** Reads one operator from `ops` if present. `is` / `is not` mean `=` / `<>`. */
  private binOp(ops: string[]): BinOp | null {
    const t = this.peek();
    if (t.kind === 'op' && ops.includes(t.text)) { this.next(); return t.text as BinOp; }
    if (t.kind === 'word') {
      if (t.text === 'is' && ops.includes('=')) {
        this.next();
        return this.acceptWord('not') ? '<>' : '=';
      }
      if (ops.includes(t.text) && ['and', 'or', 'div', 'mod'].includes(t.text)) {
        this.next();
        return t.text as BinOp;
      }
    }
    return null;
  }

  private or = (): Expr => this.left(this.and, ['or']);
  private and = (): Expr => this.left(this.equality, ['and']);
  private equality = (): Expr => this.left(this.relational, ['=', '<>']);
  private relational = (): Expr => this.left(this.concat, ['<', '>', '<=', '>=']);
  private concat = (): Expr => this.left(this.additive, ['&', '&&']);
  private additive = (): Expr => this.left(this.multiplicative, ['+', '-']);
  private multiplicative = (): Expr => this.left(this.power, ['*', '/', 'div', 'mod']);

  private power = (): Expr => {
    const l = this.unary();
    if (this.isOp('^')) {
      this.next();
      this.enter();
      try { return { t: 'bin', op: '^', l, r: this.power() }; } finally { this.leave(); }
    }
    return l;
  };

  private unary = (): Expr => {
    if (this.isOp('-') || this.isWord('not')) {
      const op = this.next().text === '-' ? '-' : 'not';
      this.enter();
      try { return { t: 'un', op, e: this.unary() }; } finally { this.leave(); }
    }
    return this.primary();
  };

  private primary(): Expr {
    const t = this.peek();
    if (t.kind === 'number') { this.next(); return { t: 'num', v: t.text }; }
    if (t.kind === 'string') { this.next(); return { t: 'str', v: t.text }; }
    if (t.kind === 'op' && t.text === '(') {
      this.next();
      const e = this.expr();
      if (!this.isOp(')')) this.fail('Expected ")"');
      this.next();
      return e;
    }
    if (t.kind === 'word') {
      if (t.text === 'card' || t.text === 'cd') {
        this.next();
        if (!this.acceptWord('field', 'fld')) this.fail('Expected "field"');
        return { t: 'field', card: true, ref: this.fieldRef() };
      }
      if (t.text === 'field' || t.text === 'fld') {
        this.next();
        return { t: 'field', card: false, ref: this.fieldRef() };
      }
      if (!KEYWORDS.has(t.text)) { this.next(); return { t: 'var', name: t.text }; }
    }
    if (t.kind === 'eof' || t.kind === 'newline') this.fail('Expected a value');
    this.fail(`Can't understand "${t.text}"`);
  }

  private fieldRef(): Expr {
    const t = this.peek();
    const e = this.primary();
    if (e.t === 'field') this.fail('Expected a field name or number', t);
    return e;
  }
}
