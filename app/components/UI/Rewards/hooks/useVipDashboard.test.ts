import { act, renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { VipDashboardState } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  setVipDashboard,
  setVipDashboardError,
  setVipDashboardLoading,
} from '../../../../reducers/rewards';
import {
  selectVipDashboard,
  selectVipDashboardError,
  selectVipDashboardLoading,
} from '../../../../reducers/rewards/selectors';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { useVipDashboard } from './useVipDashboard';

const mockVipDashboardSelector = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
  selectIsCurrentSubscriptionVipEnabled: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectVipDashboard: jest.fn(() => mockVipDashboardSelector),
  selectVipDashboardLoading: jest.fn(),
  selectVipDashboardError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setVipDashboard: jest.fn((payload) => ({ type: 'setVipDashboard', payload })),
  setVipDashboardError: jest.fn((payload) => ({
    type: 'setVipDashboardError',
    payload,
  })),
  setVipDashboardLoading: jest.fn((payload) => ({
    type: 'setVipDashboardLoading',
    payload,
  })),
}));

describe('useVipDashboard', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockSetVipDashboard = setVipDashboard as jest.MockedFunction<
    typeof setVipDashboard
  >;
  const mockSetVipDashboardError = setVipDashboardError as jest.MockedFunction<
    typeof setVipDashboardError
  >;
  const mockSetVipDashboardLoading =
    setVipDashboardLoading as jest.MockedFunction<
      typeof setVipDashboardLoading
    >;

  const vipDashboard: VipDashboardState = {
    program: { id: 'vip', name: 'VIP Pilot' },
    period: {
      start: '2026-03-31T00:00:00.000Z',
      end: '2026-04-30T23:59:59.999Z',
    },
    currentTier: { id: 'gold-fox-vip-3', name: 'Gold Fox VIP 3', tier: 3 },
    nextTier: { id: 'gold-fox-vip-4', name: 'Gold Fox VIP 4', tier: 4 },
    progress: {
      percent: 72,
      remainingSwapsUsd: 800000,
      remainingPerpsUsd: 3600000,
      estimatedDaysToNextTier: 4,
      status: 'on_track',
    },
    fees: {
      revenueShareBps: 150,
      swapsBps: 15,
      perpsBps: 4,
      nextTierRevenueShareBps: 200,
      nextTierSwapsBps: 12,
      nextTierPerpsBps: 3,
    },
    volume: {
      swapsUsd: 4100000,
      perpsUsd: 2300000,
    },
    pointsAllocation: {
      earned: 24400000,
      max: 100000000,
      percent: 24.4,
    },
    tiers: [
      {
        id: 'gold-fox-vip-3',
        name: 'Gold Fox 3',
        tier: 3,
        swapsRequirementUsd: 7000000,
        perpsRequirementUsd: 35000000,
        revenueShareBps: 150,
        swapsBps: 15,
        perpsBps: 4,
        status: 'current',
      },
    ],
    localizedText: {
      period: 'Mar 31 - Apr 30',
      progressToNextTier: 'Subline',
      swapsFeeTitle: 'Swaps fee',
      perpsFeeTitle: 'Perps fee',
      nextTierSwapsFeeDelta: '↓ 12 bps next tier',
      nextTierPerpsFeeDelta: '↓ 3 bps next tier',
      nextTierRevenueShareDelta: '↑ 2% next tier',
      revenueShareTitle: 'Revenue share',
      volumeTitle: 'Volume',
      statusMessage: 'On track',
      pointsTitle: 'Points',
      pointsAllocationTitle: 'Earn VIP allocations',
      pointsAllocationDescription: 'Body copy',
    },
    lastFetched: 123,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return 'test-subscription-id';
      }
      if (selector === selectIsCurrentSubscriptionVipEnabled) {
        return true;
      }
      if (selector === mockVipDashboardSelector) {
        return null;
      }
      if (selector === selectVipDashboardLoading) {
        return false;
      }
      if (selector === selectVipDashboardError) {
        return false;
      }
      return undefined;
    });
  });

  it('fetches and stores the VIP dashboard when the subscription is VIP enabled', async () => {
    mockEngineCall.mockResolvedValue(vipDashboard);

    const { result } = renderHook(() => useVipDashboard());

    await result.current.fetchVipDashboard();

    expect(selectVipDashboard).toHaveBeenCalledWith('test-subscription-id');
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getVIPDashboard',
      'test-subscription-id',
    );
    expect(mockSetVipDashboardLoading).toHaveBeenCalledWith(true);
    expect(mockSetVipDashboard).toHaveBeenCalledWith({
      subscriptionId: 'test-subscription-id',
      dashboard: vipDashboard,
    });
    expect(mockSetVipDashboardLoading).toHaveBeenCalledWith(false);
  });

  it('clears state and skips fetch when subscription is not VIP enabled', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return 'test-subscription-id';
      }
      if (selector === selectIsCurrentSubscriptionVipEnabled) {
        return false;
      }
      if (selector === mockVipDashboardSelector) {
        return null;
      }
      if (selector === selectVipDashboardLoading) {
        return false;
      }
      if (selector === selectVipDashboardError) {
        return false;
      }
      return undefined;
    });

    const { result } = renderHook(() => useVipDashboard());

    await result.current.fetchVipDashboard();

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockSetVipDashboard).toHaveBeenCalledWith({
      subscriptionId: 'test-subscription-id',
      dashboard: null,
    });
    expect(mockSetVipDashboardError).toHaveBeenCalledWith(false);
    expect(mockSetVipDashboardLoading).toHaveBeenCalledWith(false);
  });

  it('sets error state when fetching VIP dashboard fails', async () => {
    mockEngineCall.mockRejectedValue(new Error('VIP fetch failed'));

    const { result } = renderHook(() => useVipDashboard());

    await result.current.fetchVipDashboard();

    expect(mockSetVipDashboardError).toHaveBeenCalledWith(true);
    expect(mockSetVipDashboardLoading).toHaveBeenCalledWith(false);
  });

  it('registers the focus refresh callback', () => {
    renderHook(() => useVipDashboard());

    expect(useFocusEffect).toHaveBeenCalledWith(expect.any(Function));
  });

  it('starts with hasAttemptedFetch=false and flips it to true once a fetch resolves', async () => {
    mockEngineCall.mockResolvedValue(vipDashboard);

    const { result } = renderHook(() => useVipDashboard());

    expect(result.current.hasAttemptedFetch).toBe(false);

    await act(async () => {
      await result.current.fetchVipDashboard();
    });

    expect(result.current.hasAttemptedFetch).toBe(true);
  });

  it('flips hasAttemptedFetch=true on the non-VIP early-return path so the view exits the loading state', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId)
        return 'test-subscription-id';
      if (selector === selectIsCurrentSubscriptionVipEnabled) return false;
      if (selector === mockVipDashboardSelector) return null;
      if (selector === selectVipDashboardLoading) return false;
      if (selector === selectVipDashboardError) return false;
      return undefined;
    });

    const { result } = renderHook(() => useVipDashboard());

    expect(result.current.hasAttemptedFetch).toBe(false);

    await act(async () => {
      await result.current.fetchVipDashboard();
    });

    expect(result.current.hasAttemptedFetch).toBe(true);
  });

  it('flips hasAttemptedFetch=true even when the fetch rejects', async () => {
    mockEngineCall.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useVipDashboard());

    await act(async () => {
      await result.current.fetchVipDashboard();
    });

    expect(result.current.hasAttemptedFetch).toBe(true);
  });

  it('triggers the registered focus callback which refetches the dashboard', async () => {
    mockEngineCall.mockResolvedValue(vipDashboard);

    renderHook(() => useVipDashboard());

    const focusCallback = (useFocusEffect as jest.Mock).mock.calls.at(-1)?.[0];
    expect(focusCallback).toBeInstanceOf(Function);

    await act(async () => {
      await focusCallback();
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getVIPDashboard',
      'test-subscription-id',
    );
  });

  it('short-circuits a re-entrant fetch while a fetch is already in flight', async () => {
    // Resolve the API call on a controllable promise so we can fire a second
    // fetchVipDashboard before the first completes.
    let resolveFirst!: (value: VipDashboardState) => void;
    mockEngineCall.mockImplementationOnce(
      () =>
        new Promise<VipDashboardState>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const { result } = renderHook(() => useVipDashboard());

    let firstPromise!: Promise<void>;
    await act(async () => {
      // Kick off the first fetch (do NOT await — leave it in flight).
      firstPromise = result.current.fetchVipDashboard();
      // While that one is mid-flight, kick off a second fetch. The
      // re-entrancy guard should make this a no-op.
      await result.current.fetchVipDashboard();
    });

    // Only one Engine call so far: the second fetch returned early.
    expect(mockEngineCall).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst(vipDashboard);
      await firstPromise;
    });
  });
});
