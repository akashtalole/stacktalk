// AST for the HyperTalk core (R2). Keep in sync with design.md.

export type BinOp =
  | '+' | '-' | '*' | '/' | 'div' | 'mod' | '^'
  | '&' | '&&'
  | '=' | '<>' | '<' | '>' | '<=' | '>='
  | 'and' | 'or';

export type UnOp = '-' | 'not';

export type Expr =
  | { t: 'str'; v: string }
  | { t: 'num'; v: string }
  | { t: 'var'; name: string }
  | { t: 'field'; card: boolean; ref: Expr }
  | { t: 'un'; op: UnOp; e: Expr }
  | { t: 'bin'; op: BinOp; l: Expr; r: Expr };

export type PutMode = 'into' | 'before' | 'after';

export type RepeatKind =
  | { k: 'forever' }
  | { k: 'times'; n: Expr }
  | { k: 'while'; cond: Expr }
  | { k: 'until'; cond: Expr }
  | { k: 'with'; name: string; from: Expr; to: Expr; down: boolean };

export type Stmt =
  | { t: 'put'; value: Expr; mode: PutMode; target: Expr }
  | { t: 'get'; value: Expr }
  | { t: 'go'; card: Expr }
  | { t: 'answer'; value: Expr }
  | { t: 'pass'; name: string }
  | { t: 'send'; name: string; args: Expr[] }
  | { t: 'if'; cond: Expr; then: Stmt[]; else?: Stmt[] }
  | { t: 'repeat'; kind: RepeatKind; body: Stmt[] };

export type Handler = { name: string; params: string[]; body: Stmt[] };
export type Script = { handlers: Handler[] };

/** Words that can never be a variable or handler name. */
export const KEYWORDS = new Set([
  'on', 'end', 'put', 'into', 'before', 'after', 'get', 'go', 'to', 'card', 'cd',
  'field', 'fld', 'answer', 'pass', 'if', 'then', 'else', 'repeat', 'for', 'times',
  'while', 'until', 'with', 'down', 'and', 'or', 'not', 'is', 'div', 'mod',
]);
