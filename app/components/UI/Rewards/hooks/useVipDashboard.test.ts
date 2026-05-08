import { renderHook } from '@testing-library/react-hooks';
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
      swapsBps: 15,
      perpsBps: 4,
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
        swapsBps: 15,
        perpsBps: 4,
        status: 'current',
      },
    ],
    localizedText: {
      title: 'VIP',
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
});
