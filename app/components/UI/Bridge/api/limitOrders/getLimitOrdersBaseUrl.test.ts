import { BRIDGE_API_BASE_URL } from '../../../../../constants/bridge';
import { store } from '../../../../../store';
import { getLimitOrdersBaseUrl } from './getLimitOrdersBaseUrl';

jest.mock('../../../../../store', () => ({
  store: { getState: jest.fn() },
}));

const mockGetState = store.getState as jest.Mock;

const buildState = (swapsLimitOrder?: Record<string, unknown>) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: swapsLimitOrder ? { swapsLimitOrder } : {},
        cacheTimestamp: 0,
      },
    },
  },
});

describe('getLimitOrdersBaseUrl', () => {
  it('returns the baseUrl of the swapsLimitOrder feature flag', () => {
    mockGetState.mockReturnValue(
      buildState({
        enabled: true,
        enabledChainIds: [],
        baseUrl: 'https://limit-orders.test',
      }),
    );

    expect(getLimitOrdersBaseUrl()).toBe('https://limit-orders.test');
  });

  it('strips trailing slashes from the baseUrl', () => {
    mockGetState.mockReturnValue(
      buildState({
        enabled: true,
        enabledChainIds: [],
        baseUrl: 'https://limit-orders.test//',
      }),
    );

    expect(getLimitOrdersBaseUrl()).toBe('https://limit-orders.test');
  });

  it('falls back to BRIDGE_API_BASE_URL when the flag has no baseUrl', () => {
    mockGetState.mockReturnValue(
      buildState({ enabled: true, enabledChainIds: [] }),
    );

    expect(getLimitOrdersBaseUrl()).toBe(BRIDGE_API_BASE_URL);
  });

  it('falls back to BRIDGE_API_BASE_URL when the flag is missing', () => {
    mockGetState.mockReturnValue(buildState());

    expect(getLimitOrdersBaseUrl()).toBe(BRIDGE_API_BASE_URL);
  });
});
