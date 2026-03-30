import {
  getRampsDebugDashboardWebSocketUrl,
  isProduction,
  isRampsDebugDashboardEnabled,
} from './environment';

const originalMetamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
const originalRampsDebugDashboard = process.env.RAMPS_DEBUG_DASHBOARD;
const originalRampsDebugDashboardUrl = process.env.RAMPS_DEBUG_DASHBOARD_URL;

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
  afterEach(() => {
    if (originalRampsDebugDashboard === undefined) {
      delete process.env.RAMPS_DEBUG_DASHBOARD;
    } else {
      process.env.RAMPS_DEBUG_DASHBOARD = originalRampsDebugDashboard;
    }
  });

  it('returns true when RAMPS_DEBUG_DASHBOARD is "true"', () => {
    process.env.RAMPS_DEBUG_DASHBOARD = 'true';
    expect(isRampsDebugDashboardEnabled()).toBe(true);
  });

  it('returns false when RAMPS_DEBUG_DASHBOARD is unset', () => {
    delete process.env.RAMPS_DEBUG_DASHBOARD;
    expect(isRampsDebugDashboardEnabled()).toBe(false);
  });
});

describe('getRampsDebugDashboardWebSocketUrl', () => {
  afterEach(() => {
    if (originalRampsDebugDashboardUrl === undefined) {
      delete process.env.RAMPS_DEBUG_DASHBOARD_URL;
    } else {
      process.env.RAMPS_DEBUG_DASHBOARD_URL = originalRampsDebugDashboardUrl;
    }
  });

  it('returns default localhost URL when RAMPS_DEBUG_DASHBOARD_URL is unset', () => {
    delete process.env.RAMPS_DEBUG_DASHBOARD_URL;
    expect(getRampsDebugDashboardWebSocketUrl()).toBe('ws://localhost:8099');
  });

  it('returns trimmed URL when RAMPS_DEBUG_DASHBOARD_URL is set', () => {
    process.env.RAMPS_DEBUG_DASHBOARD_URL = '  ws://10.0.2.2:8099  ';
    expect(getRampsDebugDashboardWebSocketUrl()).toBe('ws://10.0.2.2:8099');
  });
});
