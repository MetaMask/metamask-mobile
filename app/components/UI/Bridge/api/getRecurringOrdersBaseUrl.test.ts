import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { store } from '../../../../store';
import { getRecurringOrdersBaseUrl } from './getRecurringOrdersBaseUrl';

jest.mock('../../../../store', () => ({
  store: { getState: jest.fn() },
}));

const mockGetState = store.getState as jest.Mock;

const buildState = (swapsRecurringBuy?: Record<string, unknown>) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: swapsRecurringBuy ? { swapsRecurringBuy } : {},
        cacheTimestamp: 0,
      },
    },
  },
});

describe('getRecurringOrdersBaseUrl', () => {
  it('returns the baseUrl of the swapsRecurringBuy feature flag', () => {
    mockGetState.mockReturnValue(
      buildState({
        enabled: true,
        enabledChainIds: [],
        baseUrl: 'https://recurring-orders.test',
      }),
    );

    expect(getRecurringOrdersBaseUrl()).toBe('https://recurring-orders.test');
  });

  it('strips trailing slashes from the baseUrl', () => {
    mockGetState.mockReturnValue(
      buildState({
        enabled: true,
        enabledChainIds: [],
        baseUrl: 'https://recurring-orders.test//',
      }),
    );

    expect(getRecurringOrdersBaseUrl()).toBe('https://recurring-orders.test');
  });

  it('falls back to BRIDGE_API_BASE_URL when the flag has no baseUrl', () => {
    mockGetState.mockReturnValue(
      buildState({ enabled: true, enabledChainIds: [] }),
    );

    expect(getRecurringOrdersBaseUrl()).toBe(BRIDGE_API_BASE_URL);
  });

  it('falls back to BRIDGE_API_BASE_URL when the flag is missing', () => {
    mockGetState.mockReturnValue(buildState());

    expect(getRecurringOrdersBaseUrl()).toBe(BRIDGE_API_BASE_URL);
  });
});
