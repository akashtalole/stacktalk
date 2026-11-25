import fc from 'fast-check';
import { ok } from '../../src/core/result';

describe('property test harness', () => {
  it('ok(x) always holds x', () => {
    fc.assert(fc.property(fc.anything(), (x) => {
      const r = ok(x);
      return r.ok === true && r.value === x;
    }));
  });
});
