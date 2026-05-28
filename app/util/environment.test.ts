import { getDevAutoUnlockPassword, isProduction } from './environment';

const originalMetamaskEnvironment = process.env.METAMASK_ENVIRONMENT;

describe('isProduction', () => {
  afterAll(() => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: originalMetamaskEnvironment,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  it('returns true when METAMASK_ENVIRONMENT is "production"', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'production',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    expect(isProduction()).toBe(true);
  });

  it('returns false when METAMASK_ENVIRONMENT is "development"', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'development',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    expect(isProduction()).toBe(false);
  });

  it('returns false when METAMASK_ENVIRONMENT is "test"', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'test',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    expect(isProduction()).toBe(false);
  });
});

describe('getDevAutoUnlockPassword', () => {
  const originalDevAutoUnlockPassword = process.env.DEV_AUTO_UNLOCK_PASSWORD;

  afterEach(() => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: originalMetamaskEnvironment,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'DEV_AUTO_UNLOCK_PASSWORD', {
      value: originalDevAutoUnlockPassword,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  it('returns the password in dev', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'dev',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'DEV_AUTO_UNLOCK_PASSWORD', {
      value: 'test-password',
      writable: true,
      enumerable: true,
      configurable: true,
    });

    expect(getDevAutoUnlockPassword()).toBe('test-password');
  });

  it('returns undefined outside dev', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'production',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'DEV_AUTO_UNLOCK_PASSWORD', {
      value: 'test-password',
      writable: true,
      enumerable: true,
      configurable: true,
    });

    expect(getDevAutoUnlockPassword()).toBeUndefined();
  });

  it('returns undefined when password is empty', () => {
    Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
      value: 'dev',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process.env, 'DEV_AUTO_UNLOCK_PASSWORD', {
      value: '',
      writable: true,
      enumerable: true,
      configurable: true,
    });

    expect(getDevAutoUnlockPassword()).toBeUndefined();
  });
});
