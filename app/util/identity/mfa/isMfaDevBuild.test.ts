import { isMfaDevBuild } from './isMfaDevBuild';

describe('isMfaDevBuild', () => {
  it.each([
    'production',
    'beta',
    'pre-release',
    'rc',
    'e2e',
    'exp',
    '',
    'unknown',
  ])('returns false in %s builds', (env) => {
    expect(isMfaDevBuild(env)).toBe(false);
  });

  it('returns false when METAMASK_ENVIRONMENT is unset', () => {
    const previous = process.env.METAMASK_ENVIRONMENT;
    delete process.env.METAMASK_ENVIRONMENT;
    try {
      expect(isMfaDevBuild()).toBe(false);
    } finally {
      if (previous !== undefined) {
        process.env.METAMASK_ENVIRONMENT = previous;
      }
    }
  });

  it.each(['dev', 'local', 'test'])('returns true in %s builds', (env) => {
    expect(isMfaDevBuild(env)).toBe(true);
  });

  it('is enabled in the unit test build', () => {
    expect(isMfaDevBuild()).toBe(true);
  });
});
