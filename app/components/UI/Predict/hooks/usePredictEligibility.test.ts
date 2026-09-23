import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  usePredictEligibility,
  getRefreshManagerForTesting,
} from './usePredictEligibility';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      refreshEligibility: jest.fn(),
      state: {
        eligibility: { status: 'eligible', country: 'US' },
      },
    },
  },
}));

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active' as 'active' | 'background' | 'inactive',
    addEventListener: jest.fn(),
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger');

describe('usePredictEligibility', () => {
  const mockUseSelector = useSelector as jest.Mock;
  const mockRefreshEligibility = Engine.context.PredictController
    .refreshEligibility as jest.Mock;
  const mockAppStateAddEventListener = AppState.addEventListener as jest.Mock;
  const mockDevLogger = DevLogger.log as jest.Mock;

  let mockState: {
    engine: {
      backgroundState: {
        PredictController: {
          eligibility: { status: string; country?: string };
        };
      };
    };
  };
  let mockSubscriptionRemove: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Reset the singleton manager FIRST, before setting up mocks
    const manager = getRefreshManagerForTesting();
    manager.reset();

    // Reset AppState mock
    (AppState as jest.Mocked<typeof AppState>).currentState = 'active';

    mockSubscriptionRemove = jest.fn();
    mockAppStateAddEventListener.mockReturnValue({
      remove: mockSubscriptionRemove,
    });

    mockRefreshEligibility.mockResolvedValue({
      status: 'eligible',
      country: 'US',
    });

    mockState = {
      engine: {
        backgroundState: {
          PredictController: {
            eligibility: { status: 'eligible', country: 'US' },
          },
        },
      },
    };

    (
      Engine.context.PredictController as {
        state: { eligibility: unknown };
      }
    ).state.eligibility =
      mockState.engine.backgroundState.PredictController.eligibility;

    mockUseSelector.mockImplementation((selector) => selector(mockState));
  });

  afterEach(() => {
    getRefreshManagerForTesting().reset();
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe('eligibility state', () => {
    it('returns isEligible true when eligible', () => {
      const { result } = renderHook(() => usePredictEligibility());

      expect(result.current.status).toBe('eligible');
      expect(result.current.isEligible).toBe(true);
      expect(result.current.isIneligible).toBe(false);
      expect(result.current.isChecking).toBe(false);
      expect(result.current.isUnavailable).toBe(false);
      expect(result.current.country).toBe('US');
    });

    it('returns isIneligible when status is ineligible', () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'ineligible',
        country: 'DE',
      };

      const { result } = renderHook(() => usePredictEligibility());

      expect(result.current.status).toBe('ineligible');
      expect(result.current.isEligible).toBe(false);
      expect(result.current.isIneligible).toBe(true);
      expect(result.current.country).toBe('DE');
    });

    it('returns isChecking when status is checking', () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'checking',
      };

      const { result } = renderHook(() => usePredictEligibility());

      expect(result.current.status).toBe('checking');
      expect(result.current.isChecking).toBe(true);
      expect(result.current.isEligible).toBe(false);
      expect(result.current.country).toBeUndefined();
    });

    it('returns isUnavailable when status is unavailable', () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'unavailable',
      };

      const { result } = renderHook(() => usePredictEligibility());

      expect(result.current.status).toBe('unavailable');
      expect(result.current.isUnavailable).toBe(true);
      expect(result.current.isEligible).toBe(false);
      expect(result.current.isIneligible).toBe(false);
    });
  });

  describe('singleton manager registration', () => {
    it('sets up AppState listener when first hook mounts', () => {
      renderHook(() => usePredictEligibility());

      expect(mockAppStateAddEventListener).toHaveBeenCalledTimes(1);
      expect(mockAppStateAddEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Starting eligibility refresh manager',
        expect.objectContaining({
          activeListeners: 1,
        }),
      );
    });

    it('does not create additional listeners when second hook mounts', () => {
      const { unmount: unmount1 } = renderHook(() => usePredictEligibility());

      jest.clearAllMocks();

      renderHook(() => usePredictEligibility());

      expect(mockAppStateAddEventListener).not.toHaveBeenCalled();
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Additional listener registered',
        expect.objectContaining({
          activeListeners: 2,
        }),
      );

      unmount1();
    });

    it('removes AppState listener when last hook unmounts', () => {
      const { unmount } = renderHook(() => usePredictEligibility());

      unmount();

      expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Stopping eligibility refresh manager',
      );
    });

    it('keeps listener active when one of multiple hooks unmounts', () => {
      const { unmount: unmount1 } = renderHook(() => usePredictEligibility());

      renderHook(() => usePredictEligibility());

      jest.clearAllMocks();

      unmount1();

      expect(mockSubscriptionRemove).not.toHaveBeenCalled();
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Listener unregistered',
        expect.objectContaining({
          activeListeners: 1,
        }),
      );
    });
  });

  describe('auto-refresh on app focus', () => {
    it('refreshes eligibility when app transitions from background to active', async () => {
      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: App became active, refreshing eligibility',
        expect.objectContaining({
          previousState: 'background',
        }),
      );
    });

    it('refreshes eligibility when app transitions from inactive to active', async () => {
      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('inactive');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
    });

    it('ignores transition from active to background', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('active');
        handleAppStateChange('background');
      });

      expect(mockRefreshEligibility).not.toHaveBeenCalled();
    });

    it('ignores transition from active to inactive', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('active');
        handleAppStateChange('inactive');
      });

      expect(mockRefreshEligibility).not.toHaveBeenCalled();
    });

    it('ignores transition from background to inactive', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('inactive');
      });

      expect(mockRefreshEligibility).not.toHaveBeenCalled();
    });
  });

  describe('debouncing', () => {
    it('skips refresh when less than debounce interval has passed', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(30_000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Skipping refresh due to debounce',
        expect.objectContaining({
          timeSinceLastRefresh: expect.any(Number),
          minimumInterval: 60_000,
        }),
      );
    });

    it('allows refresh when debounce interval has elapsed', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60_000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('allows refresh when more than debounce interval has elapsed', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(90_000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('resets debounce timer after successful refresh', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60_000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(30_000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });
  });

  describe('manual refresh', () => {
    it('calls controller refreshEligibility method', async () => {
      const { result } = renderHook(() => usePredictEligibility());

      await act(async () => {
        await result.current.refreshEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
    });

    it('bypasses debounce for manual refresh', async () => {
      const { result } = renderHook(() => usePredictEligibility());

      await act(async () => {
        await result.current.refreshEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);

      await act(async () => {
        await result.current.refreshEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('updates debounce timer after manual refresh', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      const { result } = renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        await result.current.refreshEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(30_000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Skipping refresh due to debounce',
        expect.any(Object),
      );
    });
  });

  describe('error handling', () => {
    it('logs error when auto-refresh fails', async () => {
      const testError = new Error('Network error');
      mockRefreshEligibility.mockRejectedValueOnce(testError);

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Auto-refresh failed',
        expect.objectContaining({
          error: 'Network error',
        }),
      );
    });

    it('logs unknown error when auto-refresh fails with non-Error', async () => {
      mockRefreshEligibility.mockRejectedValueOnce('string error');

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Auto-refresh failed',
        expect.objectContaining({
          error: 'Unknown',
        }),
      );
    });

    it('continues operation after failed refresh', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      mockRefreshEligibility.mockRejectedValueOnce(new Error('Network error'));

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      mockRefreshEligibility.mockResolvedValueOnce({
        status: 'eligible',
        country: 'US',
      });
      jest.advanceTimersByTime(60_000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });
  });

  describe('race condition prevention', () => {
    it('reuses in-flight promise when refresh is already in progress', async () => {
      let resolveRefresh: (() => void) | undefined;
      const refreshPromise = new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefreshEligibility.mockReturnValueOnce(refreshPromise);

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Refresh already in progress, reusing promise',
      );

      resolveRefresh?.();
    });

    it('prevents concurrent API calls when multiple state changes occur rapidly', async () => {
      let resolveRefresh: (() => void) | undefined;
      const refreshPromise = new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefreshEligibility.mockReturnValueOnce(refreshPromise);

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
        handleAppStateChange('background');
        handleAppStateChange('active');
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      resolveRefresh?.();
      await act(async () => {
        await refreshPromise;
      });
    });

    it('prevents concurrent calls from multiple hook instances', async () => {
      let resolveRefresh: (() => void) | undefined;
      const refreshPromise = new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefreshEligibility.mockReturnValueOnce(refreshPromise);

      renderHook(() => usePredictEligibility());
      renderHook(() => usePredictEligibility());
      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      resolveRefresh?.();
      await act(async () => {
        await refreshPromise;
      });
    });

    it('allows new refresh after previous one completes', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      let resolveFirstRefresh: (() => void) | undefined;
      const firstRefreshPromise = new Promise<void>((resolve) => {
        resolveFirstRefresh = resolve;
      });
      mockRefreshEligibility.mockReturnValueOnce(firstRefreshPromise);

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      resolveFirstRefresh?.();
      await act(async () => {
        await firstRefreshPromise;
      });

      mockRefreshEligibility.mockResolvedValueOnce({
        status: 'eligible',
        country: 'US',
      });
      jest.advanceTimersByTime(60_000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('clears in-flight promise after error', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'eligible',
        country: 'US',
      };

      let rejectRefresh: ((error: Error) => void) | undefined;
      const refreshPromise = new Promise<void>((_resolve, reject) => {
        rejectRefresh = reject;
      });
      mockRefreshEligibility.mockReturnValueOnce(refreshPromise);

      renderHook(() => usePredictEligibility());

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      rejectRefresh?.(new Error('Network error'));
      await act(async () => {
        try {
          await refreshPromise;
        } catch {
          // Expected error
        }
      });

      mockRefreshEligibility.mockResolvedValueOnce({
        status: 'eligible',
        country: 'US',
      });
      jest.advanceTimersByTime(60_000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });
  });

  describe('auto-refresh when eligibility is unavailable', () => {
    const setUnavailable = () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'unavailable',
      };
      (
        Engine.context.PredictController as { state: { eligibility: unknown } }
      ).state = {
        eligibility: { status: 'unavailable' },
      };
      mockRefreshEligibility.mockResolvedValue({ status: 'unavailable' });
    };

    it('starts a retry cycle when eligibility is unavailable', async () => {
      setUnavailable();

      renderHook(() => usePredictEligibility());

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Eligibility unavailable, auto-refreshing',
        { retryCount: 1, maxRetries: 3 },
      );
    });

    it('polls sequentially up to three automatic retries', async () => {
      setUnavailable();

      renderHook(() => usePredictEligibility());

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(mockRefreshEligibility).toHaveBeenCalledTimes(3);
    });

    it('stops polling after reaching max retries', async () => {
      setUnavailable();

      renderHook(() => usePredictEligibility());

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(3);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(3);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Max retries reached for unavailable eligibility',
        expect.objectContaining({
          retryCount: 3,
        }),
      );
    });

    it('does not start polling when eligibility is already known', async () => {
      renderHook(() => usePredictEligibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).not.toHaveBeenCalled();
    });

    it('uses one retry cycle across multiple hook instances', async () => {
      setUnavailable();

      renderHook(() => usePredictEligibility());
      renderHook(() => usePredictEligibility());

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
    });

    it('stops retrying once a definitive result is returned', async () => {
      setUnavailable();
      mockRefreshEligibility.mockResolvedValueOnce({
        status: 'eligible',
        country: 'PT',
      });

      renderHook(() => usePredictEligibility());

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
    });

    it('continues retrying after an individual failure', async () => {
      setUnavailable();
      mockRefreshEligibility.mockRejectedValueOnce(new Error('Network error'));

      renderHook(() => usePredictEligibility());

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Auto-refresh for unavailable eligibility failed',
        expect.objectContaining({
          error: 'Network error',
          retryCount: 1,
        }),
      );

      mockRefreshEligibility.mockResolvedValueOnce({ status: 'unavailable' });

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('clears the retry timeout on unmount', async () => {
      setUnavailable();

      const { unmount } = renderHook(() => usePredictEligibility());

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      unmount();

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
    });

    it('allows an explicit retry after the automatic budget is exhausted', async () => {
      setUnavailable();

      const { result } = renderHook(() => usePredictEligibility());

      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(3);

      await act(async () => {
        await result.current.refreshEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(4);
    });

    it('waits for the in-flight response before scheduling the next poll', async () => {
      setUnavailable();

      let resolveRefresh: ((value: { status: string }) => void) | undefined;
      const refreshPromise = new Promise<{ status: string }>((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefreshEligibility.mockReturnValueOnce(refreshPromise);

      renderHook(() => usePredictEligibility());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      resolveRefresh?.({ status: 'unavailable' });
      await act(async () => {
        await refreshPromise;
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('attaches to an in-flight check and starts retries if it becomes unavailable', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'checking',
      };
      (
        Engine.context.PredictController as { state: { eligibility: unknown } }
      ).state = {
        eligibility: { status: 'checking' },
      };

      let resolveRefresh: ((value: { status: string }) => void) | undefined;
      const refreshPromise = new Promise<{ status: string }>((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefreshEligibility.mockReturnValueOnce(refreshPromise);

      renderHook(() => usePredictEligibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveRefresh?.({ status: 'unavailable' });
        await refreshPromise;
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('does not start retries when an in-flight check becomes eligible', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        status: 'checking',
      };
      (
        Engine.context.PredictController as { state: { eligibility: unknown } }
      ).state = {
        eligibility: { status: 'checking' },
      };

      mockRefreshEligibility.mockResolvedValueOnce({
        status: 'eligible',
        country: 'PT',
      });

      renderHook(() => usePredictEligibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
    });
  });
});
