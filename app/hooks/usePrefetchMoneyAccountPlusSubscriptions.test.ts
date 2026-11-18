import { renderHook } from '@testing-library/react-native';

import useSubscriptions, {
  SUBSCRIPTIONS_HOME_REFETCH_INTERVAL,
  SUBSCRIPTIONS_HOME_SLOW_REFETCH_INTERVAL,
} from '../components/hooks/useSubscriptions';
import { getHardwareTier } from '../util/deviceCapability';
import type { HardwareTier, NetworkTier } from '../util/deviceCapability/types';
import { useNetworkTier } from './useNetworkTier';
import {
  resolveHomeSubscriptionsQuery,
  usePrefetchMoneyAccountPlusSubscriptions,
} from './usePrefetchMoneyAccountPlusSubscriptions';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

jest.mock('./useProSubscriptionEnabled', () => ({
  useProSubscriptionEnabled: jest.fn(() => ({
    isProSubscriptionEnabled: false,
  })),
}));

jest.mock('./useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => 'WIFI'),
}));

jest.mock('../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'MID'),
}));

jest.mock('../components/hooks/useSubscriptions', () => {
  const actual = jest.requireActual('../components/hooks/useSubscriptions');

  return {
    __esModule: true,
    ...actual,
    default: jest.fn(),
  };
});

const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);
const mockUseSubscriptions = jest.mocked(useSubscriptions);
const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockUseNetworkTier = jest.mocked(useNetworkTier);

describe('resolveHomeSubscriptionsQuery', () => {
  it('stays off while the Orange flag is off', () => {
    const result = resolveHomeSubscriptionsQuery({
      isProSubscriptionEnabled: false,
      hardwareTier: 'HIGH',
      networkTier: 'WIFI',
    });

    expect(result).toEqual({ enabled: false, refetchInterval: false });
  });

  it('skips the fetch on a known offline network', () => {
    const result = resolveHomeSubscriptionsQuery({
      isProSubscriptionEnabled: true,
      hardwareTier: null,
      networkTier: 'NONE',
    });

    expect(result).toEqual({ enabled: false, refetchInterval: false });
  });

  it.each(['SLOW_CELLULAR', 'FAST_CELLULAR', 'WIFI'] as const)(
    'skips prefetch on a LOW device with %s',
    (networkTier: NetworkTier) => {
      const result = resolveHomeSubscriptionsQuery({
        isProSubscriptionEnabled: true,
        hardwareTier: 'LOW',
        networkTier,
      });

      expect(result).toEqual({ enabled: false, refetchInterval: false });
    },
  );

  it('prefetches on a LOW device when the network tier is unknown', () => {
    const result = resolveHomeSubscriptionsQuery({
      isProSubscriptionEnabled: true,
      hardwareTier: 'LOW',
      networkTier: null,
    });

    expect(result).toEqual({
      enabled: true,
      refetchInterval: SUBSCRIPTIONS_HOME_REFETCH_INTERVAL,
    });
  });

  it('polls every 30 minutes on Wi-Fi for MID, HIGH, and unknown hardware', () => {
    const hardwareTiers: (HardwareTier | null)[] = ['MID', 'HIGH', null];

    const results = hardwareTiers.map((hardwareTier) =>
      resolveHomeSubscriptionsQuery({
        isProSubscriptionEnabled: true,
        hardwareTier,
        networkTier: 'WIFI',
      }),
    );

    expect(results).toEqual([
      {
        enabled: true,
        refetchInterval: SUBSCRIPTIONS_HOME_REFETCH_INTERVAL,
      },
      {
        enabled: true,
        refetchInterval: SUBSCRIPTIONS_HOME_REFETCH_INTERVAL,
      },
      {
        enabled: true,
        refetchInterval: SUBSCRIPTIONS_HOME_REFETCH_INTERVAL,
      },
    ]);
  });

  it('polls every 60 minutes on slow cellular when hardware is not LOW', () => {
    const result = resolveHomeSubscriptionsQuery({
      isProSubscriptionEnabled: true,
      hardwareTier: 'HIGH',
      networkTier: 'SLOW_CELLULAR',
    });

    expect(result).toEqual({
      enabled: true,
      refetchInterval: SUBSCRIPTIONS_HOME_SLOW_REFETCH_INTERVAL,
    });
  });
});

describe('usePrefetchMoneyAccountPlusSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
    });
    mockGetHardwareTier.mockReturnValue('MID');
    mockUseNetworkTier.mockReturnValue('WIFI');
  });

  it('leaves the subscriptions query off while the Orange flag is off', () => {
    renderHook(() => usePrefetchMoneyAccountPlusSubscriptions());

    expect(mockUseSubscriptions).toHaveBeenCalledWith({
      enabled: false,
      refetchInterval: false,
    });
  });

  it('polls every 30 minutes when the Orange flag is on and the device can prefetch', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });

    renderHook(() => usePrefetchMoneyAccountPlusSubscriptions());

    expect(mockUseSubscriptions).toHaveBeenCalledWith({
      enabled: true,
      refetchInterval: SUBSCRIPTIONS_HOME_REFETCH_INTERVAL,
    });
  });
});
