import { renderHook } from '@testing-library/react-hooks';
import { useUnlockedRewards } from './useUnlockedRewards';
import Engine from '../../../../core/Engine';
import {
  setUnlockedRewards,
  setUnlockedRewardLoading,
} from '../../../../reducers/rewards';
import { useDispatch, useSelector } from 'react-redux';
import { RewardClaimStatus } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../reducers/rewards', () => ({
  setUnlockedRewards: jest.fn(),
  setUnlockedRewardLoading: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectSeasonId: jest.fn(),
}));

describe('useUnlockedRewards', () => {
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
  const mockEngineSubscribe = Engine.controllerMessenger
    .subscribe as jest.MockedFunction<
    typeof Engine.controllerMessenger.subscribe
  >;
  const mockEngineUnsubscribe = Engine.controllerMessenger
    .unsubscribe as jest.MockedFunction<
    typeof Engine.controllerMessenger.unsubscribe
  >;

  const mockUnlockedRewards = [
    {
      id: 'reward-1',
      seasonRewardId: 'season-reward-1',
      claimStatus: RewardClaimStatus.CLAIMED,
    },
    {
      id: 'reward-2',
      seasonRewardId: 'season-reward-2',
      claimStatus: RewardClaimStatus.UNCLAIMED,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    // Mock useSelector calls in order: first call is seasonId, second is subscriptionId
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'test-season-id'; // selectSeasonId
      }
      if (callCount === 2) {
        return 'test-subscription-id'; // selectRewardsSubscriptionId
      }
      return null;
    });
  });

  it('should return void', () => {
    const { result } = renderHook(() => useUnlockedRewards());
    expect(result.current).toBeUndefined();
  });

  it('should skip fetch when seasonId is missing', () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return null; // selectSeasonId - missing
      }
      if (callCount === 2) {
        return 'test-subscription-id'; // selectRewardsSubscriptionId
      }
      return null;
    });

    renderHook(() => useUnlockedRewards());

    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewards([]));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(false));
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('should skip fetch when subscriptionId is missing', () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'test-season-id'; // selectSeasonId
      }
      if (callCount === 2) {
        return null; // selectRewardsSubscriptionId - missing
      }
      return null;
    });

    renderHook(() => useUnlockedRewards());

    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewards([]));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(false));
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('should fetch unlocked rewards successfully', async () => {
    mockEngineCall.mockResolvedValue(mockUnlockedRewards);

    renderHook(() => useUnlockedRewards());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getUnlockedRewards',
      'test-season-id',
      'test-subscription-id',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setUnlockedRewards(mockUnlockedRewards),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(false));
  });

  it('should handle fetch error gracefully', async () => {
    const mockError = new Error('Network error');
    mockEngineCall.mockRejectedValue(mockError);

    renderHook(() => useUnlockedRewards());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getUnlockedRewards',
      'test-season-id',
      'test-subscription-id',
    );
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewards([]));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(false));
  });

  it('should handle empty rewards array', async () => {
    mockEngineCall.mockResolvedValue([]);

    renderHook(() => useUnlockedRewards());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewards([]));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(false));
  });

  it('should handle null response from controller', async () => {
    mockEngineCall.mockResolvedValue(null);

    renderHook(() => useUnlockedRewards());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewards([]));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(false));
  });

  it('should handle undefined response from controller', async () => {
    mockEngineCall.mockResolvedValue(undefined);

    renderHook(() => useUnlockedRewards());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewards([]));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(false));
  });

  it('should set loading state correctly during fetch lifecycle', async () => {
    mockEngineCall.mockResolvedValue(mockUnlockedRewards);

    renderHook(() => useUnlockedRewards());

    // Check that loading is set to true immediately
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(true));

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check that loading is set to false after completion
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(false));
  });

  it('should call Engine controller with correct parameters', async () => {
    const customSeasonId = 'custom-season-123';
    const customSubscriptionId = 'custom-subscription-456';

    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return customSeasonId; // selectSeasonId
      }
      if (callCount === 2) {
        return customSubscriptionId; // selectRewardsSubscriptionId
      }
      return null;
    });

    mockEngineCall.mockResolvedValue(mockUnlockedRewards);

    renderHook(() => useUnlockedRewards());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getUnlockedRewards',
      customSeasonId,
      customSubscriptionId,
    );
  });

  it('should handle both seasonId and subscriptionId missing', () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return null; // selectSeasonId - missing
      }
      if (callCount === 2) {
        return null; // selectRewardsSubscriptionId - missing
      }
      return null;
    });

    renderHook(() => useUnlockedRewards());

    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewards([]));
    expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(false));
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  describe('Event Subscriptions', () => {
    it('should subscribe to accountLinked and rewardClaimed events on mount', () => {
      renderHook(() => useUnlockedRewards());

      expect(mockEngineSubscribe).toHaveBeenCalledWith(
        'RewardsController:accountLinked',
        expect.any(Function),
      );
      expect(mockEngineSubscribe).toHaveBeenCalledWith(
        'RewardsController:rewardClaimed',
        expect.any(Function),
      );
      expect(mockEngineSubscribe).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe from events on unmount', () => {
      const { unmount } = renderHook(() => useUnlockedRewards());

      unmount();

      expect(mockEngineUnsubscribe).toHaveBeenCalledWith(
        'RewardsController:accountLinked',
        expect.any(Function),
      );
      expect(mockEngineUnsubscribe).toHaveBeenCalledWith(
        'RewardsController:rewardClaimed',
        expect.any(Function),
      );
      expect(mockEngineUnsubscribe).toHaveBeenCalledTimes(2);
    });

    it('should refetch unlocked rewards when accountLinked event is triggered', async () => {
      mockEngineCall.mockResolvedValue(mockUnlockedRewards);
      let accountLinkedHandler: (() => void) | undefined;

      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      renderHook(() => useUnlockedRewards());

      // Wait for initial fetch
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Clear previous calls
      mockEngineCall.mockClear();
      mockDispatch.mockClear();

      // Trigger accountLinked event
      if (accountLinkedHandler) {
        accountLinkedHandler();
      }

      // Wait for refetch
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getUnlockedRewards',
        'test-season-id',
        'test-subscription-id',
      );
      expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(
        setUnlockedRewards(mockUnlockedRewards),
      );
    });

    it('should refetch unlocked rewards when rewardClaimed event is triggered', async () => {
      const updatedRewards = [
        {
          id: 'reward-1',
          seasonRewardId: 'season-reward-1',
          claimStatus: RewardClaimStatus.CLAIMED,
        },
        {
          id: 'reward-2',
          seasonRewardId: 'season-reward-2',
          claimStatus: RewardClaimStatus.CLAIMED, // Now claimed
        },
        {
          id: 'reward-3',
          seasonRewardId: 'season-reward-3',
          claimStatus: RewardClaimStatus.UNCLAIMED, // New reward
        },
      ];
      mockEngineCall.mockResolvedValue(updatedRewards);
      let rewardClaimedHandler: (() => void) | undefined;

      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:rewardClaimed') {
          rewardClaimedHandler = handler as () => void;
        }
      });

      renderHook(() => useUnlockedRewards());

      // Wait for initial fetch
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Clear previous calls
      mockEngineCall.mockClear();
      mockDispatch.mockClear();

      // Trigger rewardClaimed event
      if (rewardClaimedHandler) {
        rewardClaimedHandler();
      }

      // Wait for refetch
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getUnlockedRewards',
        'test-season-id',
        'test-subscription-id',
      );
      expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(
        setUnlockedRewards(updatedRewards),
      );
    });

    it('should handle event-triggered fetch errors gracefully', async () => {
      const mockError = new Error('Event fetch error');
      mockEngineCall.mockResolvedValueOnce(mockUnlockedRewards); // Initial fetch succeeds
      mockEngineCall.mockRejectedValueOnce(mockError); // Event-triggered fetch fails

      let accountLinkedHandler: (() => void) | undefined;
      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      renderHook(() => useUnlockedRewards());

      // Wait for initial fetch
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Clear previous calls
      mockDispatch.mockClear();

      // Trigger accountLinked event
      if (accountLinkedHandler) {
        accountLinkedHandler();
      }

      // Wait for refetch
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewardLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewards([]));
      expect(mockDispatch).toHaveBeenCalledWith(
        setUnlockedRewardLoading(false),
      );
    });

    it('should not refetch when event is triggered but parameters are missing', async () => {
      let callCount = 0;
      mockUseSelector.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return null; // selectSeasonId - missing
        }
        if (callCount === 2) {
          return 'test-subscription-id'; // selectRewardsSubscriptionId
        }
        return null;
      });

      let accountLinkedHandler: (() => void) | undefined;
      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      renderHook(() => useUnlockedRewards());

      // Clear previous calls
      mockEngineCall.mockClear();
      mockDispatch.mockClear();

      // Trigger accountLinked event
      if (accountLinkedHandler) {
        accountLinkedHandler();
      }

      expect(mockDispatch).toHaveBeenCalledWith(setUnlockedRewards([]));
      expect(mockDispatch).toHaveBeenCalledWith(
        setUnlockedRewardLoading(false),
      );
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should handle multiple event triggers correctly', async () => {
      mockEngineCall.mockResolvedValue(mockUnlockedRewards);
      let accountLinkedHandler: (() => void) | undefined;
      let rewardClaimedHandler: (() => void) | undefined;

      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
        if (event === 'RewardsController:rewardClaimed') {
          rewardClaimedHandler = handler as () => void;
        }
      });

      renderHook(() => useUnlockedRewards());

      // Wait for initial fetch
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Clear previous calls
      mockEngineCall.mockClear();
      mockDispatch.mockClear();

      // Trigger both events
      if (accountLinkedHandler) {
        accountLinkedHandler();
      }
      if (rewardClaimedHandler) {
        rewardClaimedHandler();
      }

      // Wait for refetches
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should have been called twice (once for each event)
      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getUnlockedRewards',
        'test-season-id',
        'test-subscription-id',
      );
    });
  });
});
