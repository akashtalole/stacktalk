// Short HyperTalk reference for lookup_command. Covers what StackTalk v1 supports.
// Written for this project, not copied from Apple's manuals.

export const REFERENCE: Record<string, string> = {
  put: 'put <value> [into | before | after] <container>\nPuts a value in a variable or field. "into" replaces, "before" and "after" add text.\nExample: put "Boo" into card field "Greeting"',
  get: 'get <value>\nPuts a value into the special variable "it".\nExample: get card field 1',
  go: 'go [to] card <number | name>\nShows another card.\nExample: go to card "Crypt"',
  answer: 'answer <value>\nShows a dialog with the value and an OK button.\nExample: answer "The ghost says hi"',
  pass: 'pass <message>\nSends the current message on to the next object in the chain (card, background, stack).\nExample: pass mouseUp',
  if: 'if <condition> then <statement> [else <statement>]\nor a multi-line form ending with "end if".\nExample:\nif x > 3 then\n  answer "big"\nelse\n  answer "small"\nend if',
  repeat: 'repeat [forever | <n> times | while <c> | until <c> | with i = a [down] to b]\n  ...\nend repeat\nExample: repeat with i = 1 to 3',
  on: 'on <message> [param, ...]\n  ...\nend <message>\nDefines a handler that runs when the object gets that message.\nExample: on mouseUp',
};

export const ALIASES: Record<string, string> = { end: 'on' };

export function lookup(name: string): string | null {
  const key = name.trim().toLowerCase();
  return REFERENCE[key] ?? REFERENCE[ALIASES[key] ?? ''] ?? null;
}
