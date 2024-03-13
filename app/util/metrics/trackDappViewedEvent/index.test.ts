import trackDappViewedEvent from './index';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';

jest.mock('../../../core/Analytics/MetaMetrics');
jest.mock(
  '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => {
    return jest.fn(() => ({
      // Return fixed metadata values for testing
    }));
  },
);

const mockMetrics = {
  trackEvent: jest.fn(),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

// Mock store.getState
let mockGetState: jest.Mock;
jest.mock('../../../store', () => {
  mockGetState = jest.fn();
  mockGetState.mockImplementation(() => ({
    browser: {
      visitedDappsByHostname: {},
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
      dispatch: jest.fn(),
    },
  };
});

describe('trackDappViewedEvent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should track with isFirstVisit = true', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostname: {},
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

    trackDappViewedEvent({
      hostname: 'uniswap.org',
      numberOfConnectedAccounts: 1,
    });

    expect(mockMetrics.trackEvent).toBeCalledWith(
      MetaMetricsEvents.DAPP_VIEWED,
      expectedMetrics,
    );
  });

  it('should track with isFirstVisit = false', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostname: { 'uniswap.org': true },
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

    trackDappViewedEvent({
      hostname: 'uniswap.org',
      numberOfConnectedAccounts: 1,
    });

    expect(mockMetrics.trackEvent).toBeCalledWith(
      MetaMetricsEvents.DAPP_VIEWED,
      expectedMetrics,
    );
  });

  it('should track with the correct number of connected accounts', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostname: { 'uniswap.org': true },
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

    trackDappViewedEvent({
      hostname: 'uniswap.org',
      numberOfConnectedAccounts: 1,
    });

    expect(mockMetrics.trackEvent).toBeCalledWith(
      MetaMetricsEvents.DAPP_VIEWED,
      expectedMetrics,
    );
  });

  it('should track with the correct number of wallet accounts', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostname: { 'uniswap.org': true },
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

    trackDappViewedEvent({
      hostname: 'uniswap.org',
      numberOfConnectedAccounts: 1,
    });

    expect(mockMetrics.trackEvent).toBeCalledWith(
      MetaMetricsEvents.DAPP_VIEWED,
      expectedMetrics,
    );
  });
});
