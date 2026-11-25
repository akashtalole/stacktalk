export type StackTalkError = { message: string; line: number; col: number };
export type Result<T, E = StackTalkError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (message: string, line = 0, col = 0): Result<never> => ({
  ok: false,
  error: { message, line, col },
});
