import { getDefaultImmersveSecureApiBaseUrlForMetaMaskEnv } from './mapImmersveSecureApiUrl';

describe('getDefaultImmersveSecureApiBaseUrlForMetaMaskEnv', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns the DEV secure host for non-production environments', () => {
    expect(getDefaultImmersveSecureApiBaseUrlForMetaMaskEnv('dev')).toBe(
      'https://test-sec.immersve.com',
    );
  });

  it('returns the PRD secure host for production', () => {
    expect(getDefaultImmersveSecureApiBaseUrlForMetaMaskEnv('production')).toBe(
      'https://api-sec.immersve.com',
    );
  });
});
