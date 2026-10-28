import { isMfaDevBuild } from './isMfaDevBuild';

describe('isMfaDevBuild', () => {
  it.each(['production', 'beta'])('returns false in %s builds', (env) => {
    expect(isMfaDevBuild(env)).toBe(false);
  });

  it.each(['dev', 'rc', 'exp', 'e2e', 'test'])(
    'returns true in %s builds',
    (env) => {
      expect(isMfaDevBuild(env)).toBe(true);
    },
  );

  it('is enabled in the unit test build', () => {
    expect(isMfaDevBuild()).toBe(true);
  });
});
