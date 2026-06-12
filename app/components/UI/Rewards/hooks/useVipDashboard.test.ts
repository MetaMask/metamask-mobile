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
    program: { id: 'mock-vip-program', name: 'Acme Rewards Beta' },
    period: {
      start: '2099-06-01T00:00:00.000Z',
      end: '2099-06-30T23:59:59.999Z',
    },
    computedAt: '2099-06-30T14:52:00.000Z',
    currentTier: {
      id: 'mock-tier-alpha-3',
      name: 'Mock Tier Alpha 3',
      tier: 3,
    },
    nextTier: { id: 'mock-tier-alpha-4', name: 'Mock Tier Alpha 4', tier: 4 },
    progress: {
      percent: 42,
      remainingPointsToNextTier: 123456,
      status: 'on_track',
    },
    fees: {
      revenueShareBps: 99,
      swapsBps: 11,
      perpsBps: 7,
      nextTierRevenueShareBps: 88,
      nextTierSwapsBps: 9,
      nextTierPerpsBps: 6,
    },
    volume: {
      swapsUsd: 1234567,
      perpsUsd: 9876543,
      points: 5555555,
      pointsFromReferrals: 111111,
      referrals: 3,
      referralsCap: 7,
    },
    pointsAllocation: {
      earned: 5555555,
      threshold: 7777777,
      percent: 71.4,
    },
    tiers: [
      {
        id: 'mock-tier-alpha-3',
        name: 'Mock Tier Alpha 3',
        tier: 3,
        pointsRequirement: 321000,
        revenueShareBps: 99,
        swapsBps: 11,
        perpsBps: 7,
        referralCarryoverBps: 4242,
        status: 'current',
      },
    ],
    localizedText: {
      periodTitle: 'Jun 1 - Jun 30',
      memberIdTitle: 'Member ID',
      swapsFeeTitle: 'Swaps fee',
      perpsFeeTitle: 'Perps fee',
      nextTierSwapsFeeDelta: '↓ 9 bps next tier',
      nextTierPerpsFeeDelta: '↓ 6 bps next tier',
      revenueShareTitle: 'Revenue share',
      referralPointsTitle: 'Referral points',
      nextTierRevenueShareDelta: '↑ 1% next tier',
      nextTierReferralPointsDelta: '↑ 42% next tier',
      topTierDescription: 'Top tier reached',
      statsTitle: 'Volume',
      pointsTitle: 'Points',
      swapsVolumeTitle: 'Swaps Volume',
      pointsFromReferralsTitle: 'Points from Referrals',
      perpsVolumeTitle: 'Perps Volume',
      vipReferralsTitle: 'VIP Referrals',
      totalPointsTitle: 'Points',
      equityLockedTitle: 'Earn VIP allocations',
      equityLockedDescription: 'Body copy',
      equityUnlockedTitle: 'VIP allocation unlocked',
      equityUnlockedDescription: 'Unlocked body copy',
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
