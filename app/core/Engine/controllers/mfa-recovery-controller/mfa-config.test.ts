import { getMfaConfig, MFA_CONFIG, resolveMfaConfigKey } from './mfa-config';

describe('resolveMfaConfigKey', () => {
  it.each([
    ['e2e', 'uat'],
    ['exp', 'uat'],
    ['production', 'prod'],
    ['beta', 'prod'],
    ['pre-release', 'prod'],
    ['rc', 'prod'],
    ['dev', 'dev'],
    ['local', 'dev'],
    ['test', 'dev'],
    ['unknown-env', 'dev'],
    [undefined, 'dev'],
  ] as const)('maps %s to %s', (environment, expected) => {
    expect(resolveMfaConfigKey(environment)).toBe(expected);
  });
});

describe('getMfaConfig', () => {
  it('returns the dev configuration set for local builds', () => {
    expect(getMfaConfig('local')).toBe(MFA_CONFIG.dev);
  });

  it('returns the uat configuration set for e2e builds', () => {
    expect(getMfaConfig('e2e')).toBe(MFA_CONFIG.uat);
  });

  it('returns the prod configuration set for production builds', () => {
    expect(getMfaConfig('production')).toBe(MFA_CONFIG.prod);
  });
});
