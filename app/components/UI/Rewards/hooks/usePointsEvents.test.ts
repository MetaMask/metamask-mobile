jest.mock('../../../../core/Engine/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { usePointsEvents } from './usePointsEvents';
import Engine from '../../../../core/Engine/Engine';
import {
  PointsEventDto,
  PaginatedPointsEventsDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

describe('usePointsEvents', () => {
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
  const mockPointsEvent: PointsEventDto = {
    id: '01974010-377f-7553-a365-0c33c8130980',
    timestamp: new Date('2024-01-01T00:00:00.000Z'),
    type: 'SWAP',
    payload: {
      srcAsset: {
        amount: '1000000000000000000',
        type: 'eip155:1/slip44:60',
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
      },
      destAsset: {
        amount: '1000000',
        type: 'eip155:1/erc20:0xa0b86991c431c924c4c4c4c4c4c4c4c4c4c4c',
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
      },
      txHash: '0x123456789',
    },
    value: 100,
    bonus: {
      bips: 1000,
      bonuses: ['bonus1'],
    },
    accountAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  };

  const mockPaginatedResponse: PaginatedPointsEventsDto = {
    results: [mockPointsEvent],
    has_more: true,
    cursor: 'next-cursor',
    total_results: 10,
  };

  const defaultOptions = {
    seasonId: 'season-123',
    subscriptionId: 'subscription-456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct default values when seasonId and subscriptionId are provided', async () => {
      mockEngineCall.mockResolvedValueOnce(mockPaginatedResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      // Initial state before any async operations
      expect(result.current.pointsEvents).toEqual([]);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.loadMore).toBe('function');
      expect(typeof result.current.refresh).toBe('function');

      // Wait for the initial fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
    });

    it('should initialize with isLoading false when seasonId is missing', () => {
      const options = {
        seasonId: undefined,
        subscriptionId: 'subscription-456',
      };

      const { result } = renderHook(() => usePointsEvents(options));

      expect(result.current.isLoading).toBe(false);
    });

    it('should initialize with isLoading false when subscriptionId is missing', () => {
      const options = {
        seasonId: 'season-123',
        subscriptionId: '',
      };

      const { result } = renderHook(() => usePointsEvents(options));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('initial data fetching', () => {
    it('should fetch points events successfully on mount', async () => {
      mockEngineCall.mockResolvedValueOnce(mockPaginatedResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-123',
          subscriptionId: 'subscription-456',
          cursor: null,
        },
      );

      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch data when seasonId is undefined', () => {
      const options = {
        seasonId: undefined,
        subscriptionId: 'subscription-456',
      };

      renderHook(() => usePointsEvents(options));

      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should not fetch data when subscriptionId is empty', () => {
      const options = {
        seasonId: 'season-123',
        subscriptionId: '',
      };

      renderHook(() => usePointsEvents(options));

      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should handle initial fetch errors', async () => {
      const mockError = new Error('Network error');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      expect(result.current.pointsEvents).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle unknown errors', async () => {
      mockEngineCall.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.error).toBe('Unknown error occurred');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('loadMore functionality', () => {
    it('should load more data when conditions are met', async () => {
      // Set up initial state with data
      mockEngineCall.mockResolvedValueOnce(mockPaginatedResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify initial state after load
      expect(result.current.hasMore).toBe(true);
      expect(result.current.isLoadingMore).toBe(false);

      const additionalEvent: PointsEventDto = {
        ...mockPointsEvent,
        id: 'additional-event',
      };

      const moreDataResponse: PaginatedPointsEventsDto = {
        results: [additionalEvent],
        has_more: false,
        cursor: null,
        total_results: 2,
      };

      mockEngineCall.mockResolvedValueOnce(moreDataResponse);

      act(() => {
        result.current.loadMore();
      });

      // Check that loadMore was triggered
      expect(result.current.isLoadingMore).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-123',
          subscriptionId: 'subscription-456',
          cursor: 'next-cursor',
        },
      );

      expect(result.current.pointsEvents).toHaveLength(2);
      expect(result.current.pointsEvents[1]).toEqual(additionalEvent);
      expect(result.current.hasMore).toBe(false);
    });

    it('should not load more when already loading more', async () => {
      // Set up initial state with data
      mockEngineCall.mockResolvedValueOnce(mockPaginatedResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock a slow response for loadMore
      let resolveLoadMore: (value: PaginatedPointsEventsDto) => void;
      const slowLoadMorePromise = new Promise<PaginatedPointsEventsDto>(
        (resolve) => {
          resolveLoadMore = resolve;
        },
      );
      mockEngineCall.mockReturnValueOnce(slowLoadMorePromise);

      // Start first loadMore
      act(() => {
        result.current.loadMore();
      });

      // Try to call loadMore again while first is still loading
      act(() => {
        result.current.loadMore();
      });

      // Should still be called only twice (initial + first loadMore)
      expect(mockEngineCall).toHaveBeenCalledTimes(2);

      // Resolve the promise
      act(() => {
        resolveLoadMore({
          results: [],
          has_more: false,
          cursor: null,
          total_results: 1,
        });
      });

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false);
      });
    });

    it('should not load more when hasMore is false', async () => {
      const initialResponse = {
        ...mockPaginatedResponse,
        has_more: false,
        cursor: null,
      };
      mockEngineCall.mockResolvedValueOnce(initialResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockEngineCall.mock.calls.length;

      act(() => {
        result.current.loadMore();
      });

      expect(mockEngineCall).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should not load more when cursor is null', async () => {
      const initialResponse = {
        ...mockPaginatedResponse,
        cursor: null,
      };
      mockEngineCall.mockResolvedValueOnce(initialResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockEngineCall.mock.calls.length;

      act(() => {
        result.current.loadMore();
      });

      expect(mockEngineCall).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should handle loadMore errors without clearing existing data', async () => {
      // Set up initial successful load
      mockEngineCall.mockResolvedValueOnce(mockPaginatedResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      // Wait for initial successful load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalPointsEvents = result.current.pointsEvents;

      // Mock error for loadMore
      mockEngineCall.mockRejectedValueOnce(new Error('Load more error'));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Load more error');
      });

      expect(result.current.isLoadingMore).toBe(false);
      // Should preserve existing data on pagination error
      expect(result.current.pointsEvents).toEqual(originalPointsEvents);
    });
  });

  describe('refresh functionality', () => {
    it('should refresh data successfully', async () => {
      // Initial load
      mockEngineCall.mockResolvedValueOnce(mockPaginatedResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Prepare refresh response
      const refreshedEvent: PointsEventDto = {
        ...mockPointsEvent,
        id: 'refreshed-event',
      };

      const refreshResponse: PaginatedPointsEventsDto = {
        results: [refreshedEvent],
        has_more: false,
        cursor: null,
        total_results: 1,
      };

      mockEngineCall.mockResolvedValueOnce(refreshResponse);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(false);

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-123',
          subscriptionId: 'subscription-456',
          cursor: null,
        },
      );

      expect(result.current.pointsEvents).toEqual([refreshedEvent]);
      expect(result.current.hasMore).toBe(false);
    });

    it('should reset cursor and hasMore state on refresh', async () => {
      // Initial load with pagination
      mockEngineCall.mockResolvedValueOnce(mockPaginatedResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify initial state has pagination
      expect(result.current.hasMore).toBe(true);

      // Mock refresh response
      const refreshResponse: PaginatedPointsEventsDto = {
        results: [mockPointsEvent],
        has_more: false,
        cursor: null,
        total_results: 1,
      };

      mockEngineCall.mockResolvedValueOnce(refreshResponse);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle refresh errors by clearing existing data', async () => {
      // Initial successful load
      mockEngineCall.mockResolvedValueOnce(mockPaginatedResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock error for refresh
      mockEngineCall.mockRejectedValueOnce(new Error('Refresh error'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBe('Refresh error');
      expect(result.current.pointsEvents).toEqual([]);
    });
  });

  describe('effect dependencies', () => {
    it('should refetch data when seasonId changes', async () => {
      mockEngineCall.mockResolvedValue(mockPaginatedResponse);

      const { result, rerender } = renderHook(
        ({ seasonId, subscriptionId }) =>
          usePointsEvents({ seasonId, subscriptionId }),
        {
          initialProps: {
            seasonId: 'season-123',
            subscriptionId: 'subscription-456',
          },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      // Change seasonId
      act(() => {
        rerender({
          seasonId: 'season-456',
          subscriptionId: 'subscription-456',
        });
      });

      await waitFor(() => {
        expect(mockEngineCall).toHaveBeenCalledTimes(2);
      });

      expect(mockEngineCall).toHaveBeenLastCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-456',
          subscriptionId: 'subscription-456',
          cursor: null,
        },
      );
    });

    it('should refetch data when subscriptionId changes', async () => {
      mockEngineCall.mockResolvedValue(mockPaginatedResponse);

      const { result, rerender } = renderHook(
        ({ seasonId, subscriptionId }) =>
          usePointsEvents({ seasonId, subscriptionId }),
        {
          initialProps: {
            seasonId: 'season-123',
            subscriptionId: 'subscription-456',
          },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      // Change subscriptionId
      act(() => {
        rerender({
          seasonId: 'season-123',
          subscriptionId: 'subscription-789',
        });
      });

      await waitFor(() => {
        expect(mockEngineCall).toHaveBeenCalledTimes(2);
      });

      expect(mockEngineCall).toHaveBeenLastCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-123',
          subscriptionId: 'subscription-789',
          cursor: null,
        },
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty results gracefully', async () => {
      const emptyResponse: PaginatedPointsEventsDto = {
        results: [],
        has_more: false,
        cursor: null,
        total_results: 0,
      };

      mockEngineCall.mockResolvedValueOnce(emptyResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pointsEvents).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle different event types correctly', async () => {
      const referralEvent: PointsEventDto = {
        id: 'referral-event',
        timestamp: new Date('2024-01-02T00:00:00.000Z'),
        type: 'REFERRAL',
        payload: null,
        value: 50,
        bonus: null,
        accountAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      };

      const mixedResponse: PaginatedPointsEventsDto = {
        results: [mockPointsEvent, referralEvent],
        has_more: false,
        cursor: null,
        total_results: 2,
      };

      mockEngineCall.mockResolvedValueOnce(mixedResponse);

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pointsEvents).toHaveLength(2);
      expect(result.current.pointsEvents[0].type).toBe('SWAP');
      expect(result.current.pointsEvents[1].type).toBe('REFERRAL');
    });
  });

  describe('Event Subscriptions', () => {
    it('should subscribe to accountLinked and rewardClaimed events on mount', () => {
      renderHook(() => usePointsEvents(defaultOptions));

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
      const { unmount } = renderHook(() => usePointsEvents(defaultOptions));

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

    it('should refresh points events when accountLinked event is triggered', async () => {
      mockEngineCall.mockResolvedValue(mockPaginatedResponse);
      let accountLinkedHandler: (() => void) | undefined;

      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear previous calls
      mockEngineCall.mockClear();

      // Trigger accountLinked event
      expect(accountLinkedHandler).toBeDefined();
      if (accountLinkedHandler) {
        act(() => {
          if (accountLinkedHandler) {
            accountLinkedHandler();
          }
        });
      }

      // Wait for refresh to complete
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-123',
          subscriptionId: 'subscription-456',
          cursor: null,
        },
      );
    });

    it('should refresh points events when rewardClaimed event is triggered', async () => {
      const updatedResponse: PaginatedPointsEventsDto = {
        results: [
          mockPointsEvent,
          {
            id: '01974010-377f-7553-a365-0c33c8130981',
            timestamp: new Date('2024-01-02T00:00:00.000Z'),
            type: 'REFERRAL',
            payload: null,
            value: 200,
            bonus: null,
            accountAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          },
        ],
        has_more: false,
        cursor: null,
        total_results: 2,
      };
      mockEngineCall.mockResolvedValue(updatedResponse);
      let rewardClaimedHandler: (() => void) | undefined;

      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:rewardClaimed') {
          rewardClaimedHandler = handler as () => void | undefined;
        }
      });

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear previous calls
      mockEngineCall.mockClear();

      // Trigger rewardClaimed event
      expect(rewardClaimedHandler).toBeDefined();
      if (rewardClaimedHandler) {
        act(() => {
          if (rewardClaimedHandler) {
            rewardClaimedHandler();
          }
        });
      }

      // Wait for refresh to complete
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-123',
          subscriptionId: 'subscription-456',
          cursor: null,
        },
      );
      expect(result.current.pointsEvents).toHaveLength(2);
    });

    it('should not refresh when event is triggered but seasonId is missing', async () => {
      const options = {
        seasonId: undefined,
        subscriptionId: 'subscription-456',
      };
      let accountLinkedHandler: (() => void) | undefined;

      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      renderHook(() => usePointsEvents(options));

      // Clear previous calls
      mockEngineCall.mockClear();

      // Trigger accountLinked event
      expect(accountLinkedHandler).toBeDefined();
      if (accountLinkedHandler) {
        act(() => {
          if (accountLinkedHandler) {
            accountLinkedHandler();
          }
        });
      }

      // Should not have called the API
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should not refresh when event is triggered but subscriptionId is missing', async () => {
      const options = {
        seasonId: 'season-123',
        subscriptionId: '',
      };
      let rewardClaimedHandler: (() => void) | undefined;

      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:rewardClaimed') {
          rewardClaimedHandler = handler as () => void;
        }
      });

      renderHook(() => usePointsEvents(options));

      // Clear previous calls
      mockEngineCall.mockClear();

      // Trigger rewardClaimed event
      expect(rewardClaimedHandler).toBeDefined();
      if (rewardClaimedHandler) {
        act(() => {
          if (rewardClaimedHandler) {
            rewardClaimedHandler();
          }
        });
      }

      // Should not have called the API
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should handle event-triggered refresh errors gracefully', async () => {
      const mockError = new Error('Event refresh error');
      mockEngineCall.mockResolvedValueOnce(mockPaginatedResponse); // Initial fetch succeeds
      mockEngineCall.mockRejectedValueOnce(mockError); // Event-triggered refresh fails

      let accountLinkedHandler: (() => void) | undefined;
      mockEngineSubscribe.mockImplementation((event, handler) => {
        if (event === 'RewardsController:accountLinked') {
          accountLinkedHandler = handler as () => void;
        }
      });

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger accountLinked event
      expect(accountLinkedHandler).toBeDefined();
      if (accountLinkedHandler) {
        act(() => {
          if (accountLinkedHandler) {
            accountLinkedHandler();
          }
        });
      }

      // Wait for refresh to complete with error
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });

      expect(result.current.error).toBe('Event refresh error');
      expect(result.current.pointsEvents).toEqual([]); // Should clear data on refresh error
    });

    it('should handle multiple event triggers correctly', async () => {
      mockEngineCall.mockResolvedValue(mockPaginatedResponse);
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

      const { result } = renderHook(() => usePointsEvents(defaultOptions));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear previous calls
      mockEngineCall.mockClear();

      // Trigger both events
      expect(accountLinkedHandler).toBeDefined();
      expect(rewardClaimedHandler).toBeDefined();
      if (accountLinkedHandler && rewardClaimedHandler) {
        act(() => {
          if (accountLinkedHandler) {
            accountLinkedHandler();
          }
          if (rewardClaimedHandler) {
            rewardClaimedHandler();
          }
        });
      }

      // Wait for refreshes to complete
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });

      // Should have been called twice (once for each event)
      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-123',
          subscriptionId: 'subscription-456',
          cursor: null,
        },
      );
    });
  });
});
