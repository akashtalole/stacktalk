// Stack -> StackTalk JSON (M1.4). Rect is [left, top, width, height] in card pixels.
import type { Layer, Part, Stack } from './reader.js';

export type StObject = { id: number; name: string; rect: [number, number, number, number]; visible: boolean; script: string; text?: string };
export type StLayer = { id: number; name: string; script: string; buttons: StObject[]; fields: StObject[] };
export type StCard = StLayer & { background: number; backgroundText: Record<string, string> };
export type StackTalkJson = {
  name: string;
  width: number;
  height: number;
  script: string;
  backgrounds: StLayer[];
  cards: StCard[];
  notConverted: string[];
};

const rect = (p: Part): StObject['rect'] => [p.rect.left, p.rect.top, p.rect.right - p.rect.left, p.rect.bottom - p.rect.top];

function layer(l: Layer, ownText: Record<number, string>): StLayer {
  const obj = (p: Part): StObject => {
    const o: StObject = { id: p.id, name: p.name, rect: rect(p), visible: p.visible, script: p.script };
    const t = ownText[p.id];
    if (t !== undefined && t !== '') o.text = t;
    return o;
  };
  return {
    id: l.id,
    name: l.name,
    script: l.script,
    buttons: l.parts.filter((p) => p.kind === 'button').map(obj),
    fields: l.parts.filter((p) => p.kind === 'field').map(obj),
  };
}

export function toStackTalk(stack: Stack, name: string): StackTalkJson {
  return {
    name,
    width: stack.cardWidth,
    height: stack.cardHeight,
    script: stack.script,
    // A background's own content entries hold shared text for its parts.
    backgrounds: stack.backgrounds.map((b) => layer(b, b.text.bg)),
    cards: stack.cards.map((c) => ({
      ...layer(c, c.text.card),
      background: c.backgroundId,
      backgroundText: Object.fromEntries(Object.entries(c.text.bg).filter(([, v]) => v !== '')),
    })),
    notConverted: stack.warnings,
  };
}
