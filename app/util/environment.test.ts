import { isProduction } from './environment';

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
