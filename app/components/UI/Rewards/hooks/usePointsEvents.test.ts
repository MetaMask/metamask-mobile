import { act, renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useFocusEffect } from '@react-navigation/native';

// Add longer timeout for waitFor to prevent test flakiness
const waitForOptions = { timeout: 5000 };
import { usePointsEvents } from './usePointsEvents';

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

// Mock React Navigation hooks
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

describe('usePointsEvents', () => {
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;

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
    total_results: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue(mockPaginatedResponse);

    // Reset the mocked hooks
    mockUseFocusEffect.mockClear();
    mockUseInvalidateByRewardEvents.mockImplementation(() => {
      // Mock implementation
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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Wait for the error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch');
      expect(result.current.pointsEvents).toEqual([]);
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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Wait for the error to be set
      await waitFor(
        () => expect(result.current.error).not.toBeNull(),
        waitForOptions,
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Unknown error occurred');
      expect(result.current.pointsEvents).toEqual([]);
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

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

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

      // Wait for initial load
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();
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

  describe('event subscriptions', () => {
    it('should subscribe to reward events', () => {
      renderHook(() =>
        usePointsEvents({
          seasonId: 'season-1',
          subscriptionId: 'sub-1',
        }),
      );

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Verify subscription to events
      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        ['RewardsController:accountLinked', 'RewardsController:rewardClaimed'],
        expect.any(Function),
      );
    });
  });
});
