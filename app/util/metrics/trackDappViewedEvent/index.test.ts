import trackDappViewedEvent from './index';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';

jest.mock('../../../core/Analytics/MetaMetrics');
// Need to mock this module since it uses store.getState, which interferes with the mocks from this test file.
jest.mock(
  '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn(),
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

  it('tracks as first visit when dapp hostname not in history', () => {
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
      Referrer: 'https://uniswap.org',
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

  it('does not tracks as first visit when dapp hostname is in history', () => {
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
      Referrer: 'https://uniswap.org',
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

  it('tracks connected accounts number', () => {
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
      Referrer: 'https://uniswap.org',
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

  it('tracks account number', () => {
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
      Referrer: 'https://uniswap.org',
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

  it('tracks dapp url', () => {
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
      Referrer: 'https://uniswap.org',
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
