import { renderHook } from '@testing-library/react-hooks';
import { useActivePointsBoosts } from './useActivePointsBoosts';
import Engine from '../../../../core/Engine';
import {
  setActiveBoosts,
  setActiveBoostsLoading,
  setActiveBoostsError,
} from '../../../../reducers/rewards';
import { useDispatch, useSelector } from 'react-redux';

import Logger from '../../../../util/Logger';

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
  setActiveBoosts: jest.fn(),
  setActiveBoostsLoading: jest.fn(),
  setActiveBoostsError: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectSeasonId: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('useActivePointsBoosts', () => {
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
  const mockLogger = Logger.log as jest.MockedFunction<typeof Logger.log>;

  const mockActiveBoosts = [
    {
      id: 'boost-1',
      name: 'Test Boost 1',
      icon: {
        lightModeUrl: 'light.png',
        darkModeUrl: 'dark.png',
      },
      boostBips: 1000,
      seasonLong: true,
      backgroundColor: '#FF0000',
    },
    {
      id: 'boost-2',
      name: 'Test Boost 2',
      icon: {
        lightModeUrl: 'light2.png',
        darkModeUrl: 'dark2.png',
      },
      boostBips: 500,
      seasonLong: false,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      backgroundColor: '#00FF00',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    // Mock useSelector calls in order: first call is subscriptionId, second is seasonId
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'test-subscription-id'; // selectRewardsSubscriptionId
      }
      if (callCount === 2) {
        return 'test-season-id'; // selectSeasonId
      }
      return null;
    });
  });

  it('should return void', () => {
    const { result } = renderHook(() => useActivePointsBoosts());
    expect(result.current).toBeUndefined();
  });

  it('should skip fetch when seasonId is missing', () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'test-subscription-id'; // selectRewardsSubscriptionId
      }
      if (callCount === 2) {
        return null; // selectSeasonId - missing
      }
      return null;
    });

    renderHook(() => useActivePointsBoosts());

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockLogger).toHaveBeenCalledWith(
      'useActivePointsBoosts: Missing seasonId or subscriptionId',
      {
        seasonId: null,
        subscriptionId: 'test-subscription-id',
      },
    );
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('should skip fetch when subscriptionId is missing', () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return null; // selectRewardsSubscriptionId - missing
      }
      if (callCount === 2) {
        return 'test-season-id'; // selectSeasonId
      }
      return null;
    });

    renderHook(() => useActivePointsBoosts());

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockLogger).toHaveBeenCalledWith(
      'useActivePointsBoosts: Missing seasonId or subscriptionId',
      {
        seasonId: 'test-season-id',
        subscriptionId: null,
      },
    );
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('should fetch active points boosts successfully', async () => {
    mockEngineCall.mockResolvedValue(mockActiveBoosts);

    renderHook(() => useActivePointsBoosts());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getActivePointsBoosts',
      'test-season-id',
      'test-subscription-id',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setActiveBoosts(mockActiveBoosts),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    // The hook doesn't log success messages, only errors and missing parameters
  });

  it('should handle fetch error gracefully', async () => {
    const mockError = new Error('Network error');
    mockEngineCall.mockRejectedValue(mockError);

    renderHook(() => useActivePointsBoosts());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getActivePointsBoosts',
      'test-season-id',
      'test-subscription-id',
    );
    expect(mockLogger).toHaveBeenCalledWith(
      'useActivePointsBoosts: Failed to fetch active points boosts:',
      'Network error',
    );
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(true));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    // Verify setActiveBoosts was not called in error case to prevent UI flash
    const setActiveBoostsCalls = mockDispatch.mock.calls.filter(
      (call) =>
        call[0] &&
        typeof call[0] === 'object' &&
        call[0].type?.includes('setActiveBoosts'),
    );
    expect(setActiveBoostsCalls).toHaveLength(0);
  });

  it('should handle empty boosts array', async () => {
    mockEngineCall.mockResolvedValue([]);

    renderHook(() => useActivePointsBoosts());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoosts([]));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    // The hook doesn't log success messages, only errors and missing parameters
  });

  it('should handle null response from controller', async () => {
    mockEngineCall.mockResolvedValue(null);

    renderHook(() => useActivePointsBoosts());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoosts([]));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    // The hook doesn't log success messages, only errors and missing parameters
  });

  describe('Event Subscriptions', () => {
    it('should subscribe to accountLinked and rewardClaimed events on mount', () => {
      renderHook(() => useActivePointsBoosts());

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
      const { unmount } = renderHook(() => useActivePointsBoosts());

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

    it('should refetch boosts when accountLinked event is triggered', async () => {
      mockEngineCall.mockResolvedValue(mockActiveBoosts);
      let accountLinkedHandler: (() => void) | undefined;

      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      renderHook(() => useActivePointsBoosts());

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
        'RewardsController:getActivePointsBoosts',
        'test-season-id',
        'test-subscription-id',
      );
      expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(
        setActiveBoosts(mockActiveBoosts),
      );
    });

    it('should refetch boosts when rewardClaimed event is triggered', async () => {
      mockEngineCall.mockResolvedValue(mockActiveBoosts);
      let rewardClaimedHandler: (() => void) | undefined;

      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:rewardClaimed') {
          rewardClaimedHandler = handler as () => void;
        }
      });

      renderHook(() => useActivePointsBoosts());

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
        'RewardsController:getActivePointsBoosts',
        'test-season-id',
        'test-subscription-id',
      );
      expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(
        setActiveBoosts(mockActiveBoosts),
      );
    });

    it('should handle event-triggered fetch errors gracefully', async () => {
      const mockError = new Error('Event fetch error');
      mockEngineCall.mockResolvedValueOnce(mockActiveBoosts); // Initial fetch succeeds
      mockEngineCall.mockRejectedValueOnce(mockError); // Event-triggered fetch fails

      let accountLinkedHandler: (() => void) | undefined;
      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      renderHook(() => useActivePointsBoosts());

      // Wait for initial fetch
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Clear previous calls
      mockDispatch.mockClear();
      mockLogger.mockClear();

      // Trigger accountLinked event
      if (accountLinkedHandler) {
        accountLinkedHandler();
      }

      // Wait for refetch
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger).toHaveBeenCalledWith(
        'useActivePointsBoosts: Failed to fetch active points boosts:',
        'Event fetch error',
      );
      expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(true));
      expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    });

    it('should not refetch when event is triggered but parameters are missing', async () => {
      let callCount = 0;
      mockUseSelector.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return null; // selectRewardsSubscriptionId - missing
        }
        if (callCount === 2) {
          return 'test-season-id'; // selectSeasonId
        }
        return null;
      });

      let accountLinkedHandler: (() => void) | undefined;
      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      renderHook(() => useActivePointsBoosts());

      // Clear previous calls
      mockEngineCall.mockClear();
      mockDispatch.mockClear();
      mockLogger.mockClear();

      // Trigger accountLinked event
      if (accountLinkedHandler) {
        accountLinkedHandler();
      }

      expect(mockLogger).toHaveBeenCalledWith(
        'useActivePointsBoosts: Missing seasonId or subscriptionId',
        {
          seasonId: 'test-season-id',
          subscriptionId: null,
        },
      );
      expect(mockEngineCall).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate Request Prevention', () => {
    it('should prevent duplicate requests when already loading', async () => {
      // Mock a slow response to simulate loading state
      let resolveFirstCall:
        | ((value: typeof mockActiveBoosts) => void)
        | undefined;
      const firstCallPromise = new Promise((resolve) => {
        resolveFirstCall = resolve;
      });
      mockEngineCall.mockReturnValueOnce(firstCallPromise);

      let accountLinkedHandler: (() => void) | undefined;
      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      renderHook(() => useActivePointsBoosts());

      // Trigger another fetch while first is still loading
      if (accountLinkedHandler) {
        accountLinkedHandler();
      }

      expect(mockLogger).toHaveBeenCalledWith(
        'useActivePointsBoosts: Fetch already in progress, skipping',
      );

      // Only one call should have been made
      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      // Resolve the first call
      if (resolveFirstCall) {
        resolveFirstCall(mockActiveBoosts);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });
});
