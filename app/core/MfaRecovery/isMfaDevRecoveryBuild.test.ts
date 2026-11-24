import { isMfaDevRecoveryBuild } from './isMfaDevRecoveryBuild';

describe('isMfaDevRecoveryBuild', () => {
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
    expect(isMfaDevRecoveryBuild(env)).toBe(false);
  });

  it.each(['dev', 'local', 'test'])('returns true in %s builds', (env) => {
    expect(isMfaDevRecoveryBuild(env)).toBe(true);
  });

  it('is enabled in the unit test build', () => {
    expect(isMfaDevRecoveryBuild()).toBe(true);
  });
});
