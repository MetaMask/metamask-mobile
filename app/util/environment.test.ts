import { isProduction, isRampsDebugDashboardEnabled } from './environment';

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

describe('isRampsDebugDashboardEnabled', () => {
  const original = process.env.RAMPS_DEBUG_DASHBOARD;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.RAMPS_DEBUG_DASHBOARD;
    } else {
      process.env.RAMPS_DEBUG_DASHBOARD = original;
    }
  });

  it('returns false when RAMPS_DEBUG_DASHBOARD is unset', () => {
    delete process.env.RAMPS_DEBUG_DASHBOARD;
    expect(isRampsDebugDashboardEnabled()).toBe(false);
  });

  it('returns false when RAMPS_DEBUG_DASHBOARD is not true', () => {
    process.env.RAMPS_DEBUG_DASHBOARD = 'false';
    expect(isRampsDebugDashboardEnabled()).toBe(false);
  });

  it('returns true when RAMPS_DEBUG_DASHBOARD is true', () => {
    process.env.RAMPS_DEBUG_DASHBOARD = 'true';
    expect(isRampsDebugDashboardEnabled()).toBe(true);
  });
});
