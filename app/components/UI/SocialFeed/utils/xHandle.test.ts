import { readXHandle } from './xHandle';

describe('readXHandle', () => {
  it('returns the handle without a leading @', () => {
    expect(readXHandle({ twitter: ' @DrrrCrypto ' })).toBe('DrrrCrypto');
  });

  it('returns null when twitter is missing, blank, or only @', () => {
    expect(readXHandle(undefined)).toBeNull();
    expect(readXHandle({})).toBeNull();
    expect(readXHandle({ twitter: null })).toBeNull();
    expect(readXHandle({ twitter: '   ' })).toBeNull();
    expect(readXHandle({ twitter: '@' })).toBeNull();
  });
});
