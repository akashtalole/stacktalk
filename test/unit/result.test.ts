import { ok, err } from '../../src/core/result';

describe('Result helpers', () => {
  it('ok wraps a value', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
  });
  it('err carries message and position', () => {
    expect(err('bad', 2, 3)).toEqual({ ok: false, error: { message: 'bad', line: 2, col: 3 } });
  });
});
