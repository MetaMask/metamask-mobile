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

    // Default mock for useSelector to return null pointsEvents
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectPointsEvents')) {
        return null;
      }
      return null;
    });
  });

  describe('initialization', () => {
    it('returns refresh and loadMore functions', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
      expect(result.current.loadMore).toBeDefined();
      expect(typeof result.current.loadMore).toBe('function');
    });

    it('initializes with null data and skips fetch when seasonId is undefined', async () => {
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

    it('initializes with null data and skips fetch when subscriptionId is empty', async () => {
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

    it('initializes with null data and skips fetch when enabled is false', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      expect(result.current.pointsEvents).toEqual(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('auto-fetches data when enabled with seasonId and subscriptionId', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Wait for auto-fetch to complete
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
          type: undefined,
        },
      );

      // Verify the data was loaded correctly
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('fetches data when enabled becomes true', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) =>
          usePointsEvents({
            seasonId: 'season-1',
            subscriptionId: 'sub-1',
            enabled,
          }),
        { initialProps: { enabled: false } },
      );

      // No fetch when disabled
      expect(mockCall).not.toHaveBeenCalled();
      expect(result.current.pointsEvents).toBeNull();

      // Enable the hook
      rerender({ enabled: true });

      // Wait for fetch to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Verify the API was called
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: false,
          type: undefined,
        },
      );

      // Verify the data was loaded
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
    });

    it('sets isRefreshing to true at start and false after successful refresh', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      // Starts with isRefreshing true
      expect(result.current.isRefreshing).toBe(true);

      // Wait for the data to load
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Ends with isRefreshing false and no error
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('sets error message and stops refreshing on fetch failure', async () => {
      const fetchError = new Error('Failed to fetch');
      mockCall.mockRejectedValueOnce(fetchError);

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to trigger fetch
      act(() => {
        result.current.refresh();
      });

      // Wait for the error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBe('Failed to fetch');
      expect(result.current.pointsEvents).toEqual(null);
    });

    it('sets generic error message for non-Error objects', async () => {
      mockCall.mockRejectedValueOnce({});

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to trigger fetch
      act(() => {
        result.current.refresh();
      });

      // Wait for the error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBe('Unknown error occurred');
      expect(result.current.pointsEvents).toEqual(null);
    });

    it('sets isRefreshing to false after error occurs', async () => {
      const fetchError = new Error('Network error');
      mockCall.mockRejectedValueOnce(fetchError);

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to trigger fetch
      act(() => {
        result.current.refresh();
      });

      // Wait for the error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      // Ends with isRefreshing false
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('loadMore functionality', () => {
    it('appends data and uses cursor when loadMore is called', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
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
          type: undefined,
        },
      );

      // Verify data was appended
      expect(result.current.pointsEvents).toEqual([
        mockPointsEvent,
        mockPointsEvent,
      ]);
    });

    it('blocks duplicate loadMore calls while already loading', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
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

    it('skips API call when hasMore is false', async () => {
      // Mock response with no more results
      mockCall.mockResolvedValueOnce({
        ...mockPaginatedResponse,
        has_more: false,
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for initial load
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify hasMore is false
      expect(result.current.hasMore).toBe(false);

      // Reset mock to track the next calls
      mockCall.mockClear();

      // Call loadMore
      act(() => {
        result.current.loadMore();
      });

      // Verify API was not called since hasMore is false
      expect(mockCall).not.toHaveBeenCalled();
    });
  });

  describe('refresh functionality', () => {
    it('fetches data with forceFresh=true and manages refreshing state', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

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
          type: undefined,
        },
      );

      // Verify refreshing state is false after completion
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
    });

    it('sets error and stops refreshing on refresh failure', async () => {
      // Mock error for refresh
      mockCall.mockRejectedValueOnce(new Error('Failed to refresh'));

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

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

    it('transitions isRefreshing from true to false during refresh cycle', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      // Starts with isRefreshing true
      expect(result.current.isRefreshing).toBe(true);

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Ends with isRefreshing false
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('UI store integration', () => {
    it('uses API data over UI store data when refresh is called', async () => {
      const mockStoreEvents = [
        mockPointsEvent,
        { ...mockPointsEvent, id: 'event-2' },
      ];
      const mockApiEvents = [{ ...mockPointsEvent, id: 'api-event' }];

      // Mock useSelector to return data from store
      mockUseSelector.mockImplementation((selector) => {
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
          enabled: false,
        }),
      );

      // Call refresh to trigger API call
      act(() => {
        result.current.refresh();
      });

      // Wait for API call to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Uses API data, not store data
      expect(result.current.pointsEvents).toEqual(mockApiEvents);
    });

    it('uses API data when uiStorePointsEvents is null', async () => {
      // Mock useSelector to return null from store
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectPointsEvents')) {
          return null;
        }
        return null;
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to trigger API call
      act(() => {
        result.current.refresh();
      });

      // Wait for API call to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Uses API data
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
    });

    it('uses API data when uiStorePointsEvents is empty array', async () => {
      // Mock useSelector to return empty array from store
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectPointsEvents')) {
          return [];
        }
        return null;
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to trigger API call
      act(() => {
        result.current.refresh();
      });

      // Wait for API call to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Uses API data, not empty store data
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
    });
  });

  describe('Redux dispatch integration', () => {
    it('dispatches setPointsEventsAction on successful fetch', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to trigger fetch
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify dispatch was called with the correct action
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'rewards/setPointsEvents',
        payload: [mockPointsEvent],
      });
    });

    it('dispatches setPointsEventsAction with appended data on loadMore', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
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

    it('skips dispatch on fetch error to preserve stale state', async () => {
      const fetchError = new Error('Failed to fetch');
      mockCall.mockRejectedValueOnce(fetchError);

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to trigger fetch
      act(() => {
        result.current.refresh();
      });

      // Wait for error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      // Verify dispatch was NOT called to preserve stale state
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('preserves stale data when error occurs during refresh', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
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

      // Call refresh again
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

    it('skips dispatch on pagination error to preserve existing data', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
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

      // Verify dispatch was NOT called (preserves existing data on pagination error)
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('refreshWithoutForceFresh functionality', () => {
    it('calls API with forceFresh=false when pointsEventsUpdated event fires', async () => {
      renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
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
          type: undefined,
        },
      );
    });
  });

  describe('refresh forceFresh parameter handling', () => {
    it('calls API with forceFresh=true when refresh is called without parameter', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh without parameter (defaults to forceFresh=true)
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
          type: undefined,
        },
      );
    });

    it('calls API with forceFresh=false when refresh is called with false parameter', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

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
          type: undefined,
        },
      );
    });
  });

  describe('edge cases and additional error handling', () => {
    it('handles empty results from API', async () => {
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
          enabled: false,
        }),
      );

      // Call refresh to trigger fetch
      act(() => {
        result.current.refresh();
      });

      // Wait for the data to load
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify empty results are handled correctly
      expect(result.current.pointsEvents).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles null cursor in API response', async () => {
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
          enabled: false,
        }),
      );

      // Call refresh to trigger fetch
      act(() => {
        result.current.refresh();
      });

      // Wait for the data to load
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify null cursor is handled correctly
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns early from fetchPointsEvents when seasonId is missing', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: undefined,
          subscriptionId: 'sub-1',
        }),
      );

      // Not loading since seasonId is undefined
      expect(result.current.isLoading).toBe(false);
      expect(result.current.pointsEvents).toEqual(null);
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('returns early from fetchPointsEvents when subscriptionId is empty', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: '',
        }),
      );

      // Not loading since subscriptionId is empty
      expect(result.current.isLoading).toBe(false);
      expect(result.current.pointsEvents).toEqual(null);
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('allows concurrent first-page requests but discards stale results via activeRequestRef', async () => {
      // Mock a slow API response for the first request
      let resolveFirstPromise: (
        value: PaginatedPointsEventsDto,
      ) => void = () => {
        // do nothing
      };
      const slowFirstPromise = new Promise<PaginatedPointsEventsDto>(
        (resolve) => {
          resolveFirstPromise = resolve;
        },
      );

      // First call returns slow promise, second returns immediately
      mockCall.mockReturnValueOnce(slowFirstPromise).mockResolvedValueOnce({
        results: [{ ...mockPointsEvent, id: 'second-request-event' }],
        has_more: false,
        cursor: null,
      });

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Start first request via refresh
      act(() => {
        result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(true);

      // Trigger second first-page request via refresh (cancels the first)
      act(() => {
        result.current.refresh();
      });

      // Both requests are made (first-page requests are not blocked)
      await waitFor(
        () => expect(mockCall).toHaveBeenCalledTimes(2),
        waitForOptions,
      );

      // Wait for second request to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Resolve the first (stale) request
      resolveFirstPromise({
        results: [{ ...mockPointsEvent, id: 'first-request-event' }],
        has_more: true,
        cursor: 'stale-cursor',
      } as unknown as PaginatedPointsEventsDto);

      // Wait for stale response to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Result is from second request (stale first request was discarded)
      expect(result.current.pointsEvents).toEqual([
        { ...mockPointsEvent, id: 'second-request-event' },
      ]);
      expect(result.current.hasMore).toBe(false);
    });

    it('sets error and stops refreshing on refresh failure', async () => {
      // Mock error for refresh
      const refreshError = new Error('Refresh failed');
      mockCall.mockRejectedValueOnce(refreshError);

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

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

    it('sets error and stops loadingMore on loadMore failure', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
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

    it('skips loadMore API call when cursor is null', async () => {
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
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Call loadMore when cursor is null
      act(() => {
        result.current.loadMore();
      });

      // Does not make API call since cursor is null
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('skips loadMore API call when hasMore is false', async () => {
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
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Call loadMore when hasMore is false
      act(() => {
        result.current.loadMore();
      });

      // Does not make API call since hasMore is false
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('blocks duplicate loadMore calls via isLoadingRef', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
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

      // Only called once (duplicate blocked by isLoadingRef)
      expect(mockCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('event subscriptions', () => {
    it('subscribes to accountLinked and rewardClaimed events', () => {
      renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Verify subscription to events
      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        ['RewardsController:accountLinked', 'RewardsController:rewardClaimed'],
        expect.any(Function),
      );
    });

    it('subscribes to pointsEventsUpdated event separately', () => {
      renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Verify separate subscription to pointsEventsUpdated event
      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        ['RewardsController:pointsEventsUpdated'],
        expect.any(Function),
      );
    });
  });

  describe('type filtering functionality', () => {
    it('passes type parameter to API call when provided', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          type: 'SWAP',
          enabled: false,
        }),
      );

      // Call refresh to trigger fetch
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify the API was called with type parameter
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: true,
          type: 'SWAP',
        },
      );
    });

    it('passes type parameter in loadMore call', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          type: 'PERPS',
          enabled: false,
        }),
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
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

      // Verify API call includes type parameter
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: 'next-cursor',
          forceFresh: false,
          type: 'PERPS',
        },
      );
    });

    it('passes type parameter in refresh call', async () => {
      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          type: 'CARD',
          enabled: false,
        }),
      );

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Verify API call includes type parameter
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: true,
          type: 'CARD',
        },
      );
    });

    it('refetches when type changes while enabled', async () => {
      // Arrange - Start enabled with no type
      const { result, rerender } = renderHook(
        ({ type }) =>
          usePointsEvents({
            seasonId: 'season-1',
            subscriptionId: 'sub-1',
            type,
            enabled: true,
          }),
        { initialProps: { type: undefined as 'SWAP' | undefined } },
      );

      // Wait for initial auto-fetch to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Verify initial call without type
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: false,
          type: undefined,
        },
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Act - Change type
      rerender({ type: 'SWAP' });

      // Wait for refetch to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Assert - called API with new type
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: false,
          type: 'SWAP',
        },
      );
    });

    it('resets cursor and hasMore when type changes', async () => {
      // Arrange - Start with some type, disabled
      const { result, rerender } = renderHook(
        ({ type }) =>
          usePointsEvents({
            seasonId: 'season-1',
            subscriptionId: 'sub-1',
            type,
            enabled: false,
          }),
        { initialProps: { type: 'SWAP' as 'SWAP' | 'PERPS' } },
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Load more to set cursor
      act(() => {
        result.current.loadMore();
      });

      await waitFor(
        () => expect(result.current.isLoadingMore).toBe(false),
        waitForOptions,
      );

      // Verify we have more data loaded
      expect(result.current.pointsEvents?.length).toBeGreaterThan(1);

      // Reset mock completely and set new response for type change
      mockCall.mockReset();
      mockCall.mockResolvedValue({
        results: [{ ...mockPointsEvent, id: 'perps-event' }],
        has_more: true,
        cursor: 'new-cursor',
      });

      // Act - Change type (this won't auto-fetch since enabled is false)
      rerender({ type: 'PERPS' });

      // Manually call refresh to trigger fetch with new type
      act(() => {
        result.current.refresh();
      });

      // Wait for refetch to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Assert - fetched with new type
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: true,
          type: 'PERPS',
        },
      );

      // Data is from the new fetch only
      expect(result.current.pointsEvents).toEqual([
        { ...mockPointsEvent, id: 'perps-event' },
      ]);
    });

    it('skips refetch when type stays the same and enabled is false', async () => {
      // Arrange - Start with a type, disabled
      const { result, rerender } = renderHook(
        ({ type }) =>
          usePointsEvents({
            seasonId: 'season-1',
            subscriptionId: 'sub-1',
            type,
            enabled: false,
          }),
        { initialProps: { type: 'SWAP' as const } },
      );

      // Call refresh to get initial data
      act(() => {
        result.current.refresh();
      });

      // Wait for refresh to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Act - Rerender with same type
      rerender({ type: 'SWAP' });

      // Wait a bit to ensure no API call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - does not call API again
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('auto-fetches on initial mount when enabled with type', async () => {
      // Hook auto-fetches when enabled and has valid params
      mockCall.mockClear();

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          type: 'SWAP',
          enabled: true,
        }),
      );

      // Wait for auto-fetch to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // API was called with type
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          cursor: null,
          forceFresh: false,
          type: 'SWAP',
        },
      );
    });

    it('does not fetch on initial mount when enabled is false', async () => {
      mockCall.mockClear();

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          type: 'SWAP',
          enabled: false,
        }),
      );

      // Wait for initial state to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Not loading since enabled is false
      expect(result.current.isLoading).toBe(false);

      // No API call since enabled is false
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('sets pointsEvents to null when type changes while enabled', async () => {
      // Arrange - Start enabled with some data
      const { result, rerender } = renderHook(
        ({ type }) =>
          usePointsEvents({
            seasonId: 'season-1',
            subscriptionId: 'sub-1',
            type,
            enabled: true,
          }),
        { initialProps: { type: 'SWAP' as 'SWAP' | 'PERPS' } },
      );

      // Wait for auto-fetch to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Verify we have data
      expect(result.current.pointsEvents).not.toBeNull();

      // Act - Change type (this sets pointsEvents to null before fetching)
      rerender({ type: 'PERPS' });

      // Wait for refetch to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // After fetch completes, we have new data
      expect(result.current.pointsEvents).toEqual([mockPointsEvent]);
    });

    it('skips refetch when type changes but seasonId is missing', async () => {
      // Arrange - Start without seasonId
      const { rerender } = renderHook(
        ({ type }) =>
          usePointsEvents({
            seasonId: undefined,
            subscriptionId: 'sub-1',
            type,
            enabled: true,
          }),
        { initialProps: { type: undefined as 'SWAP' | undefined } },
      );

      // Wait for initial state to settle (no fetch happens)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset mock to track the next call
      mockCall.mockClear();

      // Act - Change type
      rerender({ type: 'SWAP' });

      // Wait a bit to ensure no API call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - does not call API due to missing seasonId
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('skips refetch when type changes but subscriptionId is empty', async () => {
      // Arrange - Start without subscriptionId
      const { rerender } = renderHook(
        ({ type }) =>
          usePointsEvents({
            seasonId: 'season-1',
            subscriptionId: '',
            type,
            enabled: true,
          }),
        { initialProps: { type: undefined as 'SWAP' | undefined } },
      );

      // Wait for initial state to settle (no fetch happens)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset mock to track the next call
      mockCall.mockClear();

      // Act - Change type
      rerender({ type: 'SWAP' });

      // Wait a bit to ensure no API call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - does not call API due to empty subscriptionId
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('discards stale results when refresh is called during in-flight request', async () => {
      // Arrange - Create controllable promises for requests
      const requestPromises: {
        resolve: (value: {
          results: (typeof mockPointsEvent)[];
          has_more: boolean;
          cursor: string | null;
        }) => void;
      }[] = [];

      mockCall.mockImplementation(
        () =>
          new Promise((resolve) => {
            requestPromises.push({ resolve });
          }),
      );

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Start first request via refresh
      act(() => {
        result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(true);
      await waitFor(
        () => expect(requestPromises.length).toBe(1),
        waitForOptions,
      );

      // Call refresh while first request is still in-flight
      act(() => {
        result.current.refresh();
      });

      // Wait for second request to be made
      await waitFor(
        () => expect(requestPromises.length).toBe(2),
        waitForOptions,
      );

      // Resolve the second (refresh) request first
      requestPromises[1].resolve({
        results: [
          { ...mockPointsEvent, id: 'refresh-event', title: 'Refresh Event' },
        ],
        has_more: false,
        cursor: null,
      });

      // Wait for loading to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Now resolve the first (stale) request
      requestPromises[0].resolve({
        results: [
          { ...mockPointsEvent, id: 'stale-event', title: 'Stale Event' },
        ],
        has_more: true,
        cursor: 'old-cursor',
      });

      // Wait a bit to ensure the stale response is processed (but discarded)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Result is refresh data, not the stale data
      expect(result.current.pointsEvents).toEqual([
        { ...mockPointsEvent, id: 'refresh-event', title: 'Refresh Event' },
      ]);
      expect(result.current.hasMore).toBe(false);
    });

    it('discards stale results when multiple refreshes are called', async () => {
      // Arrange - Create controllable promises for each request
      const requestPromises: {
        resolve: (value: {
          results: (typeof mockPointsEvent)[];
          has_more: boolean;
          cursor: string | null;
        }) => void;
      }[] = [];

      mockCall.mockImplementation(
        () =>
          new Promise((resolve) => {
            requestPromises.push({ resolve });
          }),
      );

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Start first request via refresh
      act(() => {
        result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(true);
      await waitFor(
        () => expect(requestPromises.length).toBe(1),
        waitForOptions,
      );

      // Call refresh twice while requests are in-flight
      act(() => {
        result.current.refresh();
      });
      await waitFor(
        () => expect(requestPromises.length).toBe(2),
        waitForOptions,
      );

      act(() => {
        result.current.refresh();
      });
      await waitFor(
        () => expect(requestPromises.length).toBe(3),
        waitForOptions,
      );

      // Resolve requests out of order: first the oldest, then newest, then middle
      // Resolve first request (stale)
      requestPromises[0].resolve({
        results: [{ ...mockPointsEvent, id: 'first-event' }],
        has_more: false,
        cursor: null,
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Resolve third request (current)
      requestPromises[2].resolve({
        results: [{ ...mockPointsEvent, id: 'third-event' }],
        has_more: false,
        cursor: null,
      });

      // Wait for loading to complete
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Now resolve the middle request (stale)
      requestPromises[1].resolve({
        results: [{ ...mockPointsEvent, id: 'second-event' }],
        has_more: true,
        cursor: 'middle-cursor',
      });

      // Wait a bit to ensure the stale response is processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Result is third (latest) request data
      expect(result.current.pointsEvents).toEqual([
        { ...mockPointsEvent, id: 'third-event' },
      ]);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('enabled option', () => {
    it('refetches when subscriptionId changes while enabled', async () => {
      const { result, rerender } = renderHook(
        ({ subscriptionId }) =>
          usePointsEvents({
            seasonId: 'season-1',
            subscriptionId,
            enabled: true,
          }),
        { initialProps: { subscriptionId: 'sub-1' } },
      );

      // Wait for initial auto-fetch to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Reset mock to track the next call
      mockCall.mockClear();

      // Change subscriptionId (e.g., account switch)
      rerender({ subscriptionId: 'sub-2' });

      // Wait for refetch to complete
      await waitFor(
        () => expect(result.current.isLoading).toBe(false),
        waitForOptions,
      );

      // Assert - called API with new subscriptionId
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        {
          seasonId: 'season-1',
          subscriptionId: 'sub-2',
          cursor: null,
          forceFresh: false,
          type: undefined,
        },
      );
    });

    it('does not refetch when subscriptionId changes while disabled', async () => {
      const { result, rerender } = renderHook(
        ({ subscriptionId }) =>
          usePointsEvents({
            seasonId: 'season-1',
            subscriptionId,
            enabled: false,
          }),
        { initialProps: { subscriptionId: 'sub-1' } },
      );

      // No fetch since disabled
      expect(mockCall).not.toHaveBeenCalled();

      // Change subscriptionId
      rerender({ subscriptionId: 'sub-2' });

      // Wait a bit to ensure no API call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - still no API call since disabled
      expect(mockCall).not.toHaveBeenCalled();
      expect(result.current.pointsEvents).toBeNull();
    });

    it('keeps isRefreshing true when refresh is cancelled by newer request', async () => {
      // Arrange - Create controllable promises for requests
      const requestPromises: {
        resolve: (value: {
          results: (typeof mockPointsEvent)[];
          has_more: boolean;
          cursor: string | null;
        }) => void;
      }[] = [];

      mockCall.mockImplementation(
        () =>
          new Promise((resolve) => {
            requestPromises.push({ resolve });
          }),
      );

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Start first refresh
      act(() => {
        result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(true);
      await waitFor(
        () => expect(requestPromises.length).toBe(1),
        waitForOptions,
      );

      // Start second refresh (cancels first)
      act(() => {
        result.current.refresh();
      });

      await waitFor(
        () => expect(requestPromises.length).toBe(2),
        waitForOptions,
      );

      // Resolve first request (cancelled)
      requestPromises[0].resolve({
        results: [{ ...mockPointsEvent, id: 'cancelled-event' }],
        has_more: false,
        cursor: null,
      });

      // isRefreshing should still be true because second request is still in flight
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(result.current.isRefreshing).toBe(true);

      // Resolve second request
      requestPromises[1].resolve({
        results: [{ ...mockPointsEvent, id: 'final-event' }],
        has_more: false,
        cursor: null,
      });

      // Now isRefreshing should be false
      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      expect(result.current.pointsEvents).toEqual([
        { ...mockPointsEvent, id: 'final-event' },
      ]);
    });

    it('discards stale pagination results when first-page request starts', async () => {
      // Arrange - Create controllable promises for requests
      const requestPromises: {
        resolve: (value: {
          results: (typeof mockPointsEvent)[];
          has_more: boolean;
          cursor: string | null;
        }) => void;
      }[] = [];

      mockCall.mockImplementation(
        () =>
          new Promise((resolve) => {
            requestPromises.push({ resolve });
          }),
      );

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Get initial data via refresh
      act(() => {
        result.current.refresh();
      });

      await waitFor(
        () => expect(requestPromises.length).toBe(1),
        waitForOptions,
      );

      // Resolve initial request with has_more: true and cursor
      requestPromises[0].resolve({
        results: [{ ...mockPointsEvent, id: 'initial-event' }],
        has_more: true,
        cursor: 'page-2-cursor',
      });

      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      expect(result.current.pointsEvents).toEqual([
        { ...mockPointsEvent, id: 'initial-event' },
      ]);

      // Start pagination request (loadMore)
      act(() => {
        result.current.loadMore();
      });

      await waitFor(
        () => expect(requestPromises.length).toBe(2),
        waitForOptions,
      );

      expect(result.current.isLoadingMore).toBe(true);

      // While pagination is in flight, start a new first-page request (e.g., filter change)
      act(() => {
        result.current.refresh();
      });

      await waitFor(
        () => expect(requestPromises.length).toBe(3),
        waitForOptions,
      );

      // Resolve the pagination request (stale - should be discarded)
      requestPromises[1].resolve({
        results: [{ ...mockPointsEvent, id: 'stale-pagination-event' }],
        has_more: false,
        cursor: null,
      });

      // Wait a bit for stale response to be processed
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Resolve the new first-page request
      requestPromises[2].resolve({
        results: [{ ...mockPointsEvent, id: 'new-filtered-event' }],
        has_more: false,
        cursor: null,
      });

      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Assert - only new filtered data, no stale pagination data appended
      expect(result.current.pointsEvents).toEqual([
        { ...mockPointsEvent, id: 'new-filtered-event' },
      ]);
    });

    it('resets isLoadingMore when pagination is cancelled by first-page request', async () => {
      // Arrange - Create controllable promises for requests
      const requestPromises: {
        resolve: (value: {
          results: (typeof mockPointsEvent)[];
          has_more: boolean;
          cursor: string | null;
        }) => void;
      }[] = [];

      mockCall.mockImplementation(
        () =>
          new Promise((resolve) => {
            requestPromises.push({ resolve });
          }),
      );

      const { result } = renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
          enabled: false,
        }),
      );

      // Get initial data via refresh
      act(() => {
        result.current.refresh();
      });

      await waitFor(
        () => expect(requestPromises.length).toBe(1),
        waitForOptions,
      );

      requestPromises[0].resolve({
        results: [{ ...mockPointsEvent, id: 'initial-event' }],
        has_more: true,
        cursor: 'page-2-cursor',
      });

      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // Start pagination request
      act(() => {
        result.current.loadMore();
      });

      await waitFor(
        () => expect(requestPromises.length).toBe(2),
        waitForOptions,
      );

      expect(result.current.isLoadingMore).toBe(true);

      // Start first-page request while pagination is in flight
      act(() => {
        result.current.refresh();
      });

      await waitFor(
        () => expect(requestPromises.length).toBe(3),
        waitForOptions,
      );

      // Resolve cancelled pagination request
      requestPromises[1].resolve({
        results: [{ ...mockPointsEvent, id: 'cancelled-pagination' }],
        has_more: false,
        cursor: null,
      });

      // Wait for cancelled response to be processed
      await new Promise((resolve) => setTimeout(resolve, 50));

      // isLoadingMore should be reset since pagination was cancelled
      // (the finally block doesn't run setIsLoadingMore(false) for cancelled requests,
      // but the cancellation check returns early before the finally block resets it)
      // Actually, let's verify the state after the first-page request completes
      requestPromises[2].resolve({
        results: [{ ...mockPointsEvent, id: 'new-data' }],
        has_more: false,
        cursor: null,
      });

      await waitFor(
        () => expect(result.current.isRefreshing).toBe(false),
        waitForOptions,
      );

      // isLoadingMore should be false after everything completes
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.pointsEvents).toEqual([
        { ...mockPointsEvent, id: 'new-data' },
      ]);
    });
  });
});
