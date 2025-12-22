import trackDappViewedEvent from './index';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import { createMockAccountsControllerState } from '../../test/accountsControllerTestUtils';
import { MOCK_KEYRING_CONTROLLER } from '../../../selectors/keyringController/testUtils';

const MOCK_ADDRESS_1 = '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A';
const MOCK_ADDRESS_2 = '0x519d2CE57898513F676a5C3b66496c3C394c9CC7';

const MOCK_DEFAULT_ACCOUNTS_CONTROLLER_STATE =
  createMockAccountsControllerState([MOCK_ADDRESS_1, MOCK_ADDRESS_2]);

const MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_ONE_ACCOUNT =
  createMockAccountsControllerState([MOCK_ADDRESS_1]);

// Mock the analytics utility
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

// Need to mock this module since it uses store.getState, which interferes with the mocks from this test file.
jest.mock(
  '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn(),
);

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
        AccountsController: MOCK_DEFAULT_ACCOUNTS_CONTROLLER_STATE,
        KeyringController: MOCK_KEYRING_CONTROLLER,
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
          AccountsController: MOCK_DEFAULT_ACCOUNTS_CONTROLLER_STATE,
          KeyringController: MOCK_KEYRING_CONTROLLER,
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

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DAPP_VIEWED,
    )
      .addProperties(expectedMetrics)
      .build();

    expect(analytics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('does not tracks as first visit when dapp hostname is in history', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostname: { 'uniswap.org': true },
      },
      engine: {
        backgroundState: {
          AccountsController: MOCK_DEFAULT_ACCOUNTS_CONTROLLER_STATE,
          KeyringController: MOCK_KEYRING_CONTROLLER,
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
    const expectedEvent = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DAPP_VIEWED,
    )
      .addProperties(expectedMetrics)
      .build();

    expect(analytics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('tracks connected accounts number', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostname: { 'uniswap.org': true },
      },
      engine: {
        backgroundState: {
          AccountsController: MOCK_DEFAULT_ACCOUNTS_CONTROLLER_STATE,
          KeyringController: MOCK_KEYRING_CONTROLLER,
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

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DAPP_VIEWED,
    )
      .addProperties(expectedMetrics)
      .build();

    expect(analytics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('tracks account number', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostname: { 'uniswap.org': true },
      },
      engine: {
        backgroundState: {
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_ONE_ACCOUNT,
          KeyringController: MOCK_KEYRING_CONTROLLER,
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

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DAPP_VIEWED,
    )
      .addProperties(expectedMetrics)
      .build();

    expect(analytics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('tracks dapp url', () => {
    mockGetState.mockImplementation(() => ({
      browser: {
        visitedDappsByHostname: { 'uniswap.org': true },
      },
      engine: {
        backgroundState: {
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_ONE_ACCOUNT,
          KeyringController: MOCK_KEYRING_CONTROLLER,
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

    const expectedEvent = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DAPP_VIEWED,
    )
      .addProperties(expectedMetrics)
      .build();

    expect(analytics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });
});
