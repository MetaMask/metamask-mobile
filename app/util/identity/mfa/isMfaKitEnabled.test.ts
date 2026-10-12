import { isMfaKitEnabled } from './isMfaKitEnabled';

describe('isMfaKitEnabled', () => {
  it.each(['production', 'beta'])('returns false in %s builds', (env) => {
    expect(isMfaKitEnabled(env)).toBe(false);
  });

  it.each(['dev', 'rc', 'exp', 'e2e', 'test'])(
    'returns true in %s builds',
    (env) => {
      expect(isMfaKitEnabled(env)).toBe(true);
    },
  );

  it('is enabled in the unit test build', () => {
    expect(isMfaKitEnabled()).toBe(true);
  });
});
