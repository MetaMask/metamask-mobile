import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { SUBSCRIPTION_STATUSES } from '@metamask/subscription-controller';
import { useQuery } from '@tanstack/react-query';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { SUBSCRIPTIONS_QUERY_KEY } from '../../../hooks/useSubscriptions';
import { PROVISIONAL_POLL_INTERVAL_MS } from '../utils/proSubscriptionPaymentStatus';
import { useProSubscriptionPaymentMonitor } from './useProSubscriptionPaymentMonitor';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    SubscriptionController: {
      getSubscriptions: jest.fn(),
    },
  },
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => 'WIFI'),
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

const mockShowActiveToast = jest.fn();
const mockDismissPaymentToast = jest.fn();

jest.mock('./useProSubscriptionPaymentToasts', () => ({
  useProSubscriptionPaymentToasts: () => ({
    showProcessingToast: jest.fn(),
    showActiveToast: mockShowActiveToast,
    dismissPaymentToast: mockDismissPaymentToast,
  }),
}));

const mockedUseSelector = jest.mocked(useSelector);
const mockedUseQuery = jest.mocked(useQuery);
const mockedUseNetworkTier = jest.mocked(useNetworkTier);
const mockedGetHardwareTier = jest.mocked(getHardwareTier);

describe('useProSubscriptionPaymentMonitor', () => {
  let status: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    status = undefined;
    mockedUseNetworkTier.mockReturnValue('WIFI');
    mockedGetHardwareTier.mockReturnValue('HIGH');
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === selectMoneyAccountPlusSubscription) {
        return status === undefined ? undefined : { status };
      }
      if (selector === selectIsSignedIn) {
        return true;
      }
      if (selector === selectIsUnlocked) {
        return true;
      }
      return undefined;
    });
  });

  it('does not toast for the status already present on mount', () => {
    status = SUBSCRIPTION_STATUSES.active;

    const { result } = renderHook(() => useProSubscriptionPaymentMonitor());

    expect(mockShowActiveToast).not.toHaveBeenCalled();
    expect(result.current.isPaymentFailedSheetOpen).toBe(false);
  });

  it('shows the active toast when a provisional plan becomes active', () => {
    status = SUBSCRIPTION_STATUSES.provisional;
    const { rerender, result } = renderHook(() =>
      useProSubscriptionPaymentMonitor(),
    );

    status = SUBSCRIPTION_STATUSES.active;
    rerender(undefined);

    expect(mockShowActiveToast).toHaveBeenCalledTimes(1);
    expect(result.current.isPaymentFailedSheetOpen).toBe(false);
  });

  it('shows the active toast when a provisional plan starts trialing', () => {
    status = SUBSCRIPTION_STATUSES.provisional;
    const { rerender } = renderHook(() => useProSubscriptionPaymentMonitor());

    status = SUBSCRIPTION_STATUSES.trialing;
    rerender(undefined);

    expect(mockShowActiveToast).toHaveBeenCalledTimes(1);
  });

  it('opens the failed sheet when a provisional plan is canceled', () => {
    status = SUBSCRIPTION_STATUSES.provisional;
    const { rerender, result } = renderHook(() =>
      useProSubscriptionPaymentMonitor(),
    );

    status = SUBSCRIPTION_STATUSES.canceled;
    rerender(undefined);

    expect(result.current.isPaymentFailedSheetOpen).toBe(true);
    expect(mockDismissPaymentToast).toHaveBeenCalledTimes(1);
    expect(mockShowActiveToast).not.toHaveBeenCalled();
  });

  it('opens the failed sheet when a provisional plan disappears', () => {
    status = SUBSCRIPTION_STATUSES.provisional;
    const { rerender, result } = renderHook(() =>
      useProSubscriptionPaymentMonitor(),
    );

    status = undefined;
    rerender(undefined);

    expect(result.current.isPaymentFailedSheetOpen).toBe(true);
    expect(mockDismissPaymentToast).toHaveBeenCalledTimes(1);
  });

  it('keeps watching when a provisional plan starts awaiting funds', () => {
    status = SUBSCRIPTION_STATUSES.provisional;
    const { rerender, result } = renderHook(() =>
      useProSubscriptionPaymentMonitor(),
    );

    status = SUBSCRIPTION_STATUSES.awaitingFunds;
    rerender(undefined);

    expect(mockShowActiveToast).not.toHaveBeenCalled();
    expect(result.current.isPaymentFailedSheetOpen).toBe(false);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
        refetchInterval: PROVISIONAL_POLL_INTERVAL_MS,
      }),
    );

    status = SUBSCRIPTION_STATUSES.active;
    rerender(undefined);

    expect(mockShowActiveToast).toHaveBeenCalledTimes(1);
    expect(result.current.isPaymentFailedSheetOpen).toBe(false);
  });

  it('opens the failed sheet when a plan awaiting funds is canceled', () => {
    status = SUBSCRIPTION_STATUSES.provisional;
    const { rerender, result } = renderHook(() =>
      useProSubscriptionPaymentMonitor(),
    );

    status = SUBSCRIPTION_STATUSES.awaitingFunds;
    rerender(undefined);

    status = SUBSCRIPTION_STATUSES.canceled;
    rerender(undefined);

    expect(result.current.isPaymentFailedSheetOpen).toBe(true);
    expect(mockDismissPaymentToast).toHaveBeenCalledTimes(1);
    expect(mockShowActiveToast).not.toHaveBeenCalled();
  });

  it('does not treat an existing awaiting-funds plan as this checkout', () => {
    status = SUBSCRIPTION_STATUSES.awaitingFunds;
    const { rerender, result } = renderHook(() =>
      useProSubscriptionPaymentMonitor(),
    );

    expect(mockedUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );

    status = SUBSCRIPTION_STATUSES.canceled;
    rerender(undefined);

    expect(result.current.isPaymentFailedSheetOpen).toBe(false);
    expect(mockShowActiveToast).not.toHaveBeenCalled();
    expect(mockDismissPaymentToast).not.toHaveBeenCalled();
  });

  it('does not toast when an unrelated plan becomes active', () => {
    const { rerender, result } = renderHook(() =>
      useProSubscriptionPaymentMonitor(),
    );

    status = SUBSCRIPTION_STATUSES.active;
    rerender(undefined);

    expect(mockShowActiveToast).not.toHaveBeenCalled();
    expect(result.current.isPaymentFailedSheetOpen).toBe(false);
  });

  it('polls while the plan is provisional on a fast network', () => {
    status = SUBSCRIPTION_STATUSES.provisional;

    renderHook(() => useProSubscriptionPaymentMonitor());

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: SUBSCRIPTIONS_QUERY_KEY,
        enabled: true,
        refetchInterval: PROVISIONAL_POLL_INTERVAL_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }),
    );
  });

  it('skips the extra poll when the network is unusable', () => {
    status = SUBSCRIPTION_STATUSES.provisional;
    mockedUseNetworkTier.mockReturnValue('NONE');

    renderHook(() => useProSubscriptionPaymentMonitor());

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        refetchInterval: false,
      }),
    );
  });

  it('skips the extra poll when the wallet is locked', () => {
    status = SUBSCRIPTION_STATUSES.provisional;
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === selectMoneyAccountPlusSubscription) {
        return { status: SUBSCRIPTION_STATUSES.provisional };
      }
      if (selector === selectIsSignedIn) {
        return true;
      }
      if (selector === selectIsUnlocked) {
        return false;
      }
      return undefined;
    });

    renderHook(() => useProSubscriptionPaymentMonitor());

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('does not poll once the plan has left provisional', () => {
    status = SUBSCRIPTION_STATUSES.active;

    renderHook(() => useProSubscriptionPaymentMonitor());

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});
