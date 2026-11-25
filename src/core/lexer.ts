import { Result, ok, err } from './result';

export type TokenKind = 'word' | 'number' | 'string' | 'op' | 'newline' | 'eof';
export type Token = { kind: TokenKind; text: string; line: number; col: number };

// Longest operators first.
const OPS = ['&&', '<>', '<=', '>=', '+', '-', '*', '/', '&', '=', '<', '>', '(', ')', ',', '^'];

const isDigit = (c: string) => c >= '0' && c <= '9';
const isWordStart = (c: string) => /[A-Za-z_]/.test(c);
const isWordChar = (c: string) => /[A-Za-z0-9_]/.test(c);

/**
 * Turns HyperTalk source into tokens (R1).
 * - Words are folded to lower case (R1.1). Strings keep their case.
 * - `--` starts a comment that runs to end of line (R1.2).
 * - A line ending in `\` or `¬` joins the next line (R1.3).
 */
export function lex(src: string): Result<Token[]> {
  const out: Token[] = [];
  let i = 0, line = 1, col = 1;
  const peek = (n = 0) => src[i + n] ?? '';
  const adv = () => {
    const c = src[i++] ?? '';
    if (c === '\n') { line++; col = 1; } else { col++; }
    return c;
  };

  while (i < src.length) {
    const c = peek();
    const startLine = line, startCol = col;

    if (c === '\r') { adv(); continue; }
    if (c === ' ' || c === '\t') { adv(); continue; }

    // Line continuation: marker, optional spaces, then newline.
    if (c === '\\' || c === '¬') {
      let j = 1;
      while (peek(j) === ' ' || peek(j) === '\t' || peek(j) === '\r') j++;
      if (peek(j) === '\n' || peek(j) === '') {
        for (let k = 0; k <= j; k++) adv();
        continue;
      }
      return err(`Can't understand "${c}" here`, line, col);
    }

    if (c === '-' && peek(1) === '-') {
      while (i < src.length && peek() !== '\n') adv();
      continue;
    }

    if (c === '\n') {
      adv();
      out.push({ kind: 'newline', text: '\n', line: startLine, col: startCol });
      continue;
    }

    if (c === '"') {
      adv();
      let s = '';
      while (i < src.length && peek() !== '"' && peek() !== '\n') s += adv();
      if (peek() !== '"') return err('Unterminated quote', startLine, startCol);
      adv();
      out.push({ kind: 'string', text: s, line: startLine, col: startCol });
      continue;
    }

    if (isDigit(c) || (c === '.' && isDigit(peek(1)))) {
      let s = '';
      let dot = false;
      while (isDigit(peek()) || (peek() === '.' && !dot && isDigit(peek(1)))) {
        if (peek() === '.') dot = true;
        s += adv();
      }
      out.push({ kind: 'number', text: s, line: startLine, col: startCol });
      continue;
    }

    if (isWordStart(c)) {
      let s = '';
      while (isWordChar(peek())) s += adv();
      out.push({ kind: 'word', text: s.toLowerCase(), line: startLine, col: startCol });
      continue;
    }

    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      for (let k = 0; k < op.length; k++) adv();
      out.push({ kind: 'op', text: op, line: startLine, col: startCol });
      continue;
    }

    return err(`Can't understand "${c}"`, line, col);
  }

  out.push({ kind: 'eof', text: '', line, col });
  return ok(out);
}
