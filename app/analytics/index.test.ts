import { trackDappVistedEvent } from './index';
import { MetaMetricsEvents } from '../core/Analytics';
import AnalyticsV2 from '../util/analyticsV2';

// Mock AnalyticsV2
jest.mock('../util/analyticsV2', () => ({
  trackEvent: jest.fn(),
}));

// Mock store.getState
let mockGetState: jest.Mock;
jest.mock('../store', () => {
  mockGetState = jest.fn();
  mockGetState.mockImplementation(() => ({
    browser: {
      visitedDappsByHostName: {},
    },
    engine: {
      backgroundState: {
        PreferencesController: {
          identities: { '0x1': true, '0x2': true },
        },
      },
    },
  }));

  return {
    store: {
      getState: mockGetState,
    },
  };
});

describe('trackDappVistedEvent', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should track with isFirstVisit = true', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostName: {},
      },
      engine: {
        backgroundState: {
          PreferencesController: {
            identities: { '0x1': true, '0x2': true },
          },
        },
      },
    }));

    const expectedMetrics = {
      is_first_visit: true,
      number_of_accounts: 2,
      number_of_accounts_connected: 1,
      source: 'in-app browser',
    };

    trackDappVistedEvent({
      hostname: 'uniswap.org',
      numberOfConnectedAccounts: 1,
    });

    expect(AnalyticsV2.trackEvent).toBeCalledWith(
      MetaMetricsEvents.DAPP_VISITED,
      expectedMetrics,
    );
  });

  it('should track with isFirstVisit = false', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostName: { 'uniswap.org': true },
      },
      engine: {
        backgroundState: {
          PreferencesController: {
            identities: { '0x1': true, '0x2': true },
          },
        },
      },
    }));

    const expectedMetrics = {
      is_first_visit: false,
      number_of_accounts: 2,
      number_of_accounts_connected: 1,
      source: 'in-app browser',
    };

    trackDappVistedEvent({
      hostname: 'uniswap.org',
      numberOfConnectedAccounts: 1,
    });

    expect(AnalyticsV2.trackEvent).toBeCalledWith(
      MetaMetricsEvents.DAPP_VISITED,
      expectedMetrics,
    );
  });

  it('should track with the correct number of connected accounts', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostName: { 'uniswap.org': true },
      },
      engine: {
        backgroundState: {
          PreferencesController: {
            identities: { '0x1': true, '0x2': true },
          },
        },
      },
    }));

    const expectedMetrics = {
      is_first_visit: false,
      number_of_accounts: 2,
      number_of_accounts_connected: 1,
      source: 'in-app browser',
    };

    trackDappVistedEvent({
      hostname: 'uniswap.org',
      numberOfConnectedAccounts: 1,
    });

    expect(AnalyticsV2.trackEvent).toBeCalledWith(
      MetaMetricsEvents.DAPP_VISITED,
      expectedMetrics,
    );
  });

  it('should track with the correct number of wallet accounts', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostName: { 'uniswap.org': true },
      },
      engine: {
        backgroundState: {
          PreferencesController: {
            identities: { '0x1': true },
          },
        },
      },
    }));

    const expectedMetrics = {
      is_first_visit: false,
      number_of_accounts: 1,
      number_of_accounts_connected: 1,
      source: 'in-app browser',
    };

    trackDappVistedEvent({
      hostname: 'uniswap.org',
      numberOfConnectedAccounts: 1,
    });

    expect(AnalyticsV2.trackEvent).toBeCalledWith(
      MetaMetricsEvents.DAPP_VISITED,
      expectedMetrics,
    );
  });
});
