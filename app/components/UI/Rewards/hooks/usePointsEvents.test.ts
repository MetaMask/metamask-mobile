import { act, renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';

// Add longer timeout for waitFor to prevent test flakiness
const waitForOptions = { timeout: 5000 };
import { usePointsEvents } from './usePointsEvents';
import { PaginatedPointsEventsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock Engine
const mockCall = jest.fn();
jest.mock('../../../../core/Engine', () => {
  const engineInstance = {
    context: {
      EngineController: {
        notifyOnStateChange: jest.fn(),
      },
    },
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  };

  return {
    __esModule: true,
    default: engineInstance,
    instance: engineInstance,
  };
});

// Mock Engine/Engine to fix the instance check
jest.mock('../../../../core/Engine/Engine', () => {
  const engineInstance = {
    context: {
      EngineController: {
        notifyOnStateChange: jest.fn(),
      },
    },
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  };

  return {
    __esModule: true,
    default: engineInstance,
    instance: engineInstance,
  };
});

// Mock useInvalidateByRewardEvents
const mockUseInvalidateByRewardEvents = jest.fn();
jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: (...args: string[]) =>
    mockUseInvalidateByRewardEvents(...args),
}));

// Mock Redux hooks
const mockUseSelector = jest.fn();
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (...args: unknown[]) => mockUseSelector(...args),
  useDispatch: () => mockDispatch,
}));

describe('usePointsEvents', () => {
  const mockPointsEvent = {
    id: 'event-1',
    title: 'Test Event',
    description: 'Test Description',
    points: 100,
    createdAt: '2023-01-01T00:00:00Z',
  };

  const mockPaginatedResponse = {
    results: [mockPointsEvent],
    has_more: true,
    cursor: 'next-cursor',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue(mockPaginatedResponse);

    // Reset the mocked hooks
    mockUseInvalidateByRewardEvents.mockImplementation(() => {
      // Mock implementation
    });

    // Default mock for useSelector to return 'activity' tab and null pointsEvents
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectActiveTab')) {
        return 'activity';
      }
      if (selector.toString().includes('selectPointsEvents')) {
        return null;
      }
      return null;
    });
  });

  describe('initialization', () => {
    it('should return refresh and loadMore functions', () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
      expect(result.current.loadMore).toBeDefined();
      expect(typeof result.current.loadMore).toBe('function');
    });

    it('should initialize with empty data and not fetch when seasonId is undefined', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: undefined,
          subscriptionId: 'sub-1',
        }),
      );

      expect(result.current.pointsEvents).toEqual(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should initialize with empty data and not fetch when subscriptionId is empty', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: '',
        }),
      );

      expect(result.current.pointsEvents).toEqual(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should fetch data when both seasonId and subscriptionId are provided', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Initial state should show loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      // Wait for the data to load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Verify the API was called correctly
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: false,
        },
      );

      // Verify the data was loaded correctly
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading to true at start and false after successful completion', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Should start with loading true
      expect(result.current.isLoading).toBe(true);

      // Wait for the data to load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Should end with loading false and no error
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors and manage loading state', async () => {
      const fetchError = new Error('Failed to fetch');
      mockCall.mockRejectedValueOnce(fetchError);

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Initial state should show loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      // Wait for the error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch');
      expect(result.current.pointsEvents).toEqual(null);
    });

    it('should handle unknown errors and manage loading state', async () => {
      mockCall.mockRejectedValueOnce({});

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Initial state should show loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      // Wait for the error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Unknown error occurred');
      expect(result.current.pointsEvents).toEqual(null);
    });

    it('should set loading to true at start and false after error', async () => {
      const fetchError = new Error('Network error');
      mockCall.mockRejectedValueOnce(fetchError);

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Should start with loading true
      expect(result.current.isLoading).toBe(true);

      // Wait for the error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      // Should end with loading false
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('loadMore functionality', () => {
    it('should load more data when loadMore is called', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Call loadMore
      act(() => {
        result.current.loadMore();
      });

      // Verify loading state
      expect(result.current.isLoadingMore).toBe(true);

      // Wait for loadMore to complete
      await waitFor(
        () => expect(result.current.isLoadingMore).toBe(false),
        waitForOptions,
      );

      // Verify API call with cursor
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: 'next-cursor',
          forceFresh: false,
        },
      );

      // Verify data was appended
      expect(result.current.pointsEvents).toEqual([
        mockPointsEvent,
        mockPointsEvent,
      ]);
    });

    it('should not load more if already loading', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next calls
      mockCall.mockClear();

      // Call loadMore
      act(() => {
        result.current.loadMore();
      });

      // Call loadMore again while still loading
      act(() => {
        result.current.loadMore();
      });

      // Wait for loadMore to complete
      await waitFor(
        () => expect(result.current.isLoadingMore).toBe(false),
        waitForOptions,
      );

      // Verify API was only called once
      expect(mockCall).toHaveBeenCalledTimes(1);
    });

    it('should not load more if there are no more results', async () => {
      // Mock response with no more results
      mockCall.mockResolvedValueOnce({
        ...mockPaginatedResponse,
        has_more: false,
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next calls
      mockCall.mockClear();

      // Call loadMore
      act(() => {
        result.current.loadMore();
      });

      // Wait for loadMore to complete
      await waitFor(
        () => expect(result.current.isLoadingMore).toBe(false),
        waitForOptions,
      );

      // Verify hasMore is false
      expect(result.current.hasMore).toBe(false);

      // Reset mock again
      mockCall.mockClear();

      // Call loadMore again
      act(() => {
        result.current.loadMore();
      });

      // Verify API was not called
      expect(mockCall).not.toHaveBeenCalled();
    });
  });

  describe('refresh functionality', () => {
    it('should refresh data when refresh is called and manage refreshing state', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      // Verify refreshing state
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.error).toBeNull();

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify API call
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: true,
        },
      );

      // Verify refreshing state is false after completion
      expect(result.current.isRefreshing).toBe(false);
    });

    it('should handle refresh errors and manage refreshing state', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Mock error for refresh
      mockCall.mockRejectedValueOnce(new Error('Failed to refresh'));

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      // Verify refreshing state starts as true
      expect(result.current.isRefreshing).toBe(true);

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify error was set and refreshing state is false
      expect(result.current.error).toBe('Failed to refresh');
      expect(result.current.isRefreshing).toBe(false);
    });

    it('should set isRefreshing to true at start and false after completion', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      // Should start with isRefreshing true
      expect(result.current.isRefreshing).toBe(true);

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Should end with isRefreshing false
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('activeTab functionality', () => {
    it('should fetch data when activeTab changes to activity', async () => {
      // Arrange - Start with a different tab
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectActiveTab')) {
          return 'overview';
        }
        if (selector.toString().includes('selectPointsEvents')) {
          return null;
        }
        return null;
      });

      const { rerender } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Initial load should not happen since we're on 'overview' tab
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset mock to track the next call
      mockCall.mockClear();

      // Act - Change activeTab to 'activity'
      act(() => {
        mockUseSelector.mockImplementation((selector) => {
          if (selector.toString().includes('selectActiveTab')) {
            return 'activity';
          }
          if (selector.toString().includes('selectPointsEvents')) {
            return null;
          }
          return null;
        });
        rerender();
      });

      // Assert - Should trigger fetchPointsEvents
      await waitFor(
        () =>
          expect(mockCall).toHaveBeenCalledWith(
            'RewardsController:getPointsEvents',
            {
              seasonId: 'season-1',
              subscriptionId: 'sub-1',
              cursor: null,
              forceFresh: false,
            },
          ),
        waitForOptions,
      );
    });

    it('should not fetch data when activeTab changes to non-activity tab', async () => {
      // Arrange - Start with overview tab (important: set BEFORE rendering)
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectActiveTab')) {
          return 'overview';
        }
        if (selector.toString().includes('selectPointsEvents')) {
          return null;
        }
        return null;
      });

      const { rerender } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial state to settle (no fetch should happen on overview tab)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset mock to track the next call
      mockCall.mockClear();

      // Act - Change activeTab to 'levels' (non-activity)
      act(() => {
        mockUseSelector.mockImplementation((selector) => {
          if (selector.toString().includes('selectActiveTab')) {
            return 'levels';
          }
          if (selector.toString().includes('selectPointsEvents')) {
            return null;
          }
          return null;
        });
        rerender();
      });

      // Wait a bit to ensure no API call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Should not trigger fetchPointsEvents
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should not fetch data when activeTab changes to activity but seasonId is missing', async () => {
      // Arrange - Start with overview tab
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectActiveTab')) {
          return 'overview';
        }
        if (selector.toString().includes('selectPointsEvents')) {
          return null;
        }
        return null;
      });

      const { rerender } = renderHook(() =>
        usePointsEvents({
          seasonId: undefined,
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial state to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset mock to track the next call
      mockCall.mockClear();

      // Act - Change activeTab to 'activity'
      act(() => {
        mockUseSelector.mockImplementation((selector) => {
          if (selector.toString().includes('selectActiveTab')) {
            return 'activity';
          }
          if (selector.toString().includes('selectPointsEvents')) {
            return null;
          }
          return null;
        });
        rerender();
      });

      // Wait a bit to ensure no API call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Should not trigger fetchPointsEvents due to missing seasonId
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should not fetch data when activeTab changes to activity but subscriptionId is empty', async () => {
      // Arrange - Start with overview tab
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectActiveTab')) {
          return 'overview';
        }
        if (selector.toString().includes('selectPointsEvents')) {
          return null;
        }
        return null;
      });

      const { rerender } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: '',
        }),
      );

      // Wait for initial state to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset mock to track the next call
      mockCall.mockClear();

      // Act - Change activeTab to 'activity'
      act(() => {
        mockUseSelector.mockImplementation((selector) => {
          if (selector.toString().includes('selectActiveTab')) {
            return 'activity';
          }
          if (selector.toString().includes('selectPointsEvents')) {
            return null;
          }
          return null;
        });
        rerender();
      });

      // Wait a bit to ensure no API call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Should not trigger fetchPointsEvents due to empty subscriptionId
      expect(mockCall).not.toHaveBeenCalled();
    });
  });

  describe('UI store integration', () => {
    it('should not load from UI store when pointsEvents is already set', async () => {
      const mockStoreEvents = [
        mockPointsEvent,
        { ...mockPointsEvent, id: 'event-2' },
      ];
      const mockApiEvents = [{ ...mockPointsEvent, id: 'api-event' }];

      // Mock useSelector to return data from store
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectActiveTab')) {
          return 'activity';
        }
        if (selector.toString().includes('selectPointsEvents')) {
          return mockStoreEvents;
        }
        return null;
      });

      // Mock API to return different data
      mockCall.mockResolvedValue({
        ...mockPaginatedResponse,
        results: mockApiEvents,
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for API call to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Should use API data, not store data
      expect(result.current.pointsEvents).toEqual(mockApiEvents);
    });

    it('should not load from UI store when uiStorePointsEvents is null', async () => {
      // Mock useSelector to return null from store
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectActiveTab')) {
          return 'activity';
        }
        if (selector.toString().includes('selectPointsEvents')) {
          return null;
        }
        return null;
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for API call to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Should use API data
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
    });

    it('should not load from UI store when uiStorePointsEvents is empty array', async () => {
      // Mock useSelector to return empty array from store
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectActiveTab')) {
          return 'activity';
        }
        if (selector.toString().includes('selectPointsEvents')) {
          return [];
        }
        return null;
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for API call to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Should use API data, not empty store data
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
    });
  });

  describe('Redux dispatch integration', () => {
    it('should dispatch setPointsEventsAction on successful initial fetch', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Verify dispatch was called with the correct action
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'rewards/setPointsEvents',
        payload: [mockPointsEvent],
      });
    });

    it('should dispatch setPointsEventsAction on successful loadMore', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockDispatch.mockClear();

      // Call loadMore
      act(() => {
        result.current.loadMore();
      });

      // Wait for loadMore to complete
      await waitFor(
        () => expect(result.current.isLoadingMore).toBe(false),
        waitForOptions,
      );

      // Verify dispatch was called with appended data
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'rewards/setPointsEvents',
        payload: [mockPointsEvent, mockPointsEvent],
      });
    });

    it('should not dispatch setPointsEventsAction on initial fetch error to preserve stale state', async () => {
      const fetchError = new Error('Failed to fetch');
      mockCall.mockRejectedValueOnce(fetchError);

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      // Verify dispatch was NOT called to preserve stale state
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should preserve stale data when error occurs during refresh', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Verify we have initial data
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
      expect(result.current.error).toBeNull();

      // Reset mock to track the next call
      mockDispatch.mockClear();

      // Mock error for refresh
      const refreshError = new Error('Failed to refresh');
      mockCall.mockRejectedValueOnce(refreshError);

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete with error
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify error was set but stale data is preserved
      expect(result.current.error).toBe('Failed to refresh');
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);

      // Verify dispatch was NOT called to preserve stale state
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch setPointsEventsAction on pagination error', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockDispatch.mockClear();

      // Mock error for loadMore
      const fetchError = new Error('Pagination error');
      mockCall.mockRejectedValueOnce(fetchError);

      // Call loadMore
      act(() => {
        result.current.loadMore();
      });

      // Wait for error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      // Verify dispatch was NOT called (should not clear existing data on pagination error)
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('refreshWithoutForceFresh functionality', () => {
    it('should call refresh with forceFresh=false when refreshWithoutForceFresh is called', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Get the refreshWithoutForceFresh function from the hook
      // Since it's not exposed directly, we'll test it through the event subscription
      // We need to simulate the event callback being called
      const subscriptionCalls = mockUseInvalidateByRewardEvents.mock.calls;
      const pointsEventsUpdatedCallback = subscriptionCalls.find((call) =>
        call[0].includes('RewardsController:pointsEventsUpdated'),
      )?.[1];

      expect(pointsEventsUpdatedCallback).toBeDefined();

      // Call the callback (this simulates the event being triggered)
      await act(async () => {
        await pointsEventsUpdatedCallback();
      });

      // Verify API call with forceFresh=false
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: false,
        },
      );
    });
  });

  describe('refresh forceFresh parameter handling', () => {
    it('should call API with forceFresh=true when refresh is called without parameter', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Call refresh without parameter (should default to forceFresh=true)
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify API call with forceFresh=true
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: true,
        },
      );
    });

    it('should call API with forceFresh=false when refresh is called with false parameter', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Call refresh with forceFresh=false
      act(() => {
        result.current.refresh(false);
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify API call with forceFresh=false
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: false,
        },
      );
    });
  });

  describe('edge cases and additional error handling', () => {
    it('should handle empty results from API', async () => {
      // Mock response with empty results
      mockCall.mockResolvedValueOnce({
        results: [],
        has_more: false,
        cursor: null,
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for the data to load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Verify empty results are handled correctly
      expect(result.current.pointsEvents).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle null cursor in API response', async () => {
      // Mock response with null cursor
      mockCall.mockResolvedValueOnce({
        results: [mockPointsEvent],
        has_more: false,
        cursor: null,
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for the data to load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Verify null cursor is handled correctly
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetchPointsEvents early return when seasonId is missing', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: undefined,
          subscriptionId: 'sub-1',
        }),
      );

      // Should not be loading since seasonId is undefined
      expect(result.current.isLoading).toBe(false);
      expect(result.current.pointsEvents).toEqual(null);
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should handle fetchPointsEvents early return when subscriptionId is empty', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: '',
        }),
      );

      // Should not be loading since subscriptionId is empty
      expect(result.current.isLoading).toBe(false);
      expect(result.current.pointsEvents).toEqual(null);
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should handle concurrent fetchPointsEvents calls by using isLoadingRef', async () => {
      // Mock a slow API response
      let resolvePromise: (value: PaginatedPointsEventsDto) => void = () => {
        // do nothing
      };
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockCall.mockReturnValueOnce(slowPromise);

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Try to trigger another fetch while the first one is still pending
      // This should be prevented by isLoadingRef
      const subscriptionCalls = mockUseInvalidateByRewardEvents.mock.calls;
      const accountLinkedCallback = subscriptionCalls.find((call) =>
        call[0].includes('RewardsController:accountLinked'),
      )?.[1];

      if (accountLinkedCallback) {
        await act(async () => {
          await accountLinkedCallback();
        });
      }

      // Resolve the slow promise
      if (resolvePromise) {
        resolvePromise(
          mockPaginatedResponse as unknown as PaginatedPointsEventsDto,
        );
      }

      // Wait for completion
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Should only have been called once due to isLoadingRef protection
      expect(mockCall).toHaveBeenCalledTimes(1);
    });

    it('should handle refresh error and maintain refreshing state correctly', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Mock error for refresh
      const refreshError = new Error('Refresh failed');
      mockCall.mockRejectedValueOnce(refreshError);

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      // Verify refreshing state starts as true
      expect(result.current.isRefreshing).toBe(true);

      // Wait for refresh to complete with error
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify error was set and refreshing state is false
      expect(result.current.error).toBe('Refresh failed');
      expect(result.current.isRefreshing).toBe(false);
    });

    it('should handle loadMore error and maintain loadingMore state correctly', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Mock error for loadMore
      const loadMoreError = new Error('Load more failed');
      mockCall.mockRejectedValueOnce(loadMoreError);

      // Call loadMore
      act(() => {
        result.current.loadMore();
      });

      // Verify loadingMore state starts as true
      expect(result.current.isLoadingMore).toBe(true);

      // Wait for loadMore to complete with error
      await waitFor(
        () => expect(result.current.isLoadingMore).toBe(false),
        waitForOptions,
      );

      // Verify error was set and loadingMore state is false
      expect(result.current.error).toBe('Load more failed');
      expect(result.current.isLoadingMore).toBe(false);
    });

    it('should handle loadMore when cursor is null', async () => {
      // Mock response with null cursor
      mockCall.mockResolvedValueOnce({
        results: [mockPointsEvent],
        has_more: false,
        cursor: null,
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Call loadMore when cursor is null
      act(() => {
        result.current.loadMore();
      });

      // Should not make API call since cursor is null
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should handle loadMore when hasMore is false', async () => {
      // Mock response with has_more: false
      mockCall.mockResolvedValueOnce({
        results: [mockPointsEvent],
        has_more: false,
        cursor: 'some-cursor',
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Call loadMore when hasMore is false
      act(() => {
        result.current.loadMore();
      });

      // Should not make API call since hasMore is false
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('should handle loadMore when already loading more', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Call loadMore
      act(() => {
        result.current.loadMore();
      });

      // Call loadMore again while still loading
      act(() => {
        result.current.loadMore();
      });

      // Wait for loadMore to complete
      await waitFor(
        () => expect(result.current.isLoadingMore).toBe(false),
        waitForOptions,
      );

      // Should only have been called once
      expect(mockCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('event subscriptions', () => {
    it('should subscribe to reward events', () => {
      renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Verify subscription to events
      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        ['RewardsController:accountLinked', 'RewardsController:rewardClaimed'],
        expect.any(Function),
      );
    });

    it('should subscribe to pointsEventsUpdated event separately', () => {
      renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Verify separate subscription to pointsEventsUpdated event
      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        ['RewardsController:pointsEventsUpdated'],
        expect.any(Function),
      );
    });
  });
});
