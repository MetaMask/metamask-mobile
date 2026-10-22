import { shouldPostAllClear } from './flaky-same-sha-history';

describe('Stage 3 all-clear', () => {
  it('never posts all-clear when history coverage is incomplete', () => {
    expect(shouldPostAllClear(false, false)).toBe(false);
  });

  it('posts all-clear when there are no findings and history finished', () => {
    expect(shouldPostAllClear(false, true)).toBe(true);
  });
});
