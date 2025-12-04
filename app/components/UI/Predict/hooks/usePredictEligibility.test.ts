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
          eligibility: Record<
            string,
            { eligible: boolean; country?: string } | undefined
          >;
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

    mockRefreshEligibility.mockResolvedValue(undefined);

    mockState = {
      engine: {
        backgroundState: {
          PredictController: {
            eligibility: {},
          },
        },
      },
    };

    mockUseSelector.mockImplementation((selector) => selector(mockState));
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe('eligibility state', () => {
    it('returns isEligible true for eligible provider', () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true, country: 'US' },
        example: { eligible: false, country: 'UK' },
      };

      const { result } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

      expect(result.current.isEligible).toBe(true);
      expect(result.current.country).toBe('US');
    });

    it('returns isEligible false for ineligible provider', () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true, country: 'US' },
        example: { eligible: false, country: 'UK' },
      };

      const { result } = renderHook(() =>
        usePredictEligibility({ providerId: 'example' }),
      );

      expect(result.current.isEligible).toBe(false);
      expect(result.current.country).toBe('UK');
    });

    it('returns false when provider eligibility is not set', () => {
      const { result } = renderHook(() =>
        usePredictEligibility({ providerId: 'unknown' }),
      );

      expect(result.current.isEligible).toBe(false);
      expect(result.current.country).toBeUndefined();
    });
  });

  describe('singleton manager registration', () => {
    it('sets up AppState listener when first hook mounts', () => {
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
      const { unmount: unmount1 } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

      jest.clearAllMocks();

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
      const { unmount } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

      unmount();

      expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Stopping eligibility refresh manager',
      );
    });

    it('keeps listener active when one of multiple hooks unmounts', () => {
      const { unmount: unmount1 } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
        polymarket: { eligible: true, country: 'US' },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
        polymarket: { eligible: true, country: 'US' },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
        polymarket: { eligible: true, country: 'US' },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
        polymarket: { eligible: true, country: 'US' },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(50);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Skipping refresh due to debounce',
        expect.objectContaining({
          timeSinceLastRefresh: expect.any(Number),
          minimumInterval: 100,
        }),
      );
    });

    it('allows refresh when debounce interval has elapsed', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true, country: 'US' },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('allows refresh when more than debounce interval has elapsed', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true, country: 'US' },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(200);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('resets debounce timer after successful refresh', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true, country: 'US' },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(50);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });
  });

  describe('manual refresh', () => {
    it('calls controller refreshEligibility method', async () => {
      const { result } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

      await act(async () => {
        await result.current.refreshEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
    });

    it('bypasses debounce for manual refresh', async () => {
      const { result } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

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
        polymarket: { eligible: true, country: 'US' },
      };

      const { result } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        await result.current.refreshEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(50);

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

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
        polymarket: { eligible: true, country: 'US' },
      };

      mockRefreshEligibility.mockRejectedValueOnce(new Error('Network error'));

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      mockRefreshEligibility.mockResolvedValueOnce(undefined);
      jest.advanceTimersByTime(100);

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

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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
        polymarket: { eligible: true, country: 'US' },
      };

      let resolveFirstRefresh: (() => void) | undefined;
      const firstRefreshPromise = new Promise<void>((resolve) => {
        resolveFirstRefresh = resolve;
      });
      mockRefreshEligibility.mockReturnValueOnce(firstRefreshPromise);

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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

      mockRefreshEligibility.mockResolvedValueOnce(undefined);
      jest.advanceTimersByTime(100);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('clears in-flight promise after error', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true, country: 'US' },
      };

      let rejectRefresh: ((error: Error) => void) | undefined;
      const refreshPromise = new Promise<void>((_resolve, reject) => {
        rejectRefresh = reject;
      });
      mockRefreshEligibility.mockReturnValueOnce(refreshPromise);

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

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

      mockRefreshEligibility.mockResolvedValueOnce(undefined);
      jest.advanceTimersByTime(100);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });
  });

  describe('auto-refresh when country is missing', () => {
    it('starts polling when country is not returned', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Country missing, auto-refreshing eligibility',
        { providerId: 'polymarket', retryCount: 1, maxRetries: 3 },
      );
    });

    it('polls again after polling interval when country is still missing', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      await act(async () => {
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

    it('continues polling while country is missing up to max retries', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      // Wait for initial poll to complete (retry 1)
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      // Advance timer to trigger second poll (retry 2)
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);

      // Advance timer to trigger third poll (retry 3 - max)
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(3);
    });

    it('stops polling after reaching max retries', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      // Complete all 3 retries
      await act(async () => {
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

      // Advance timer again - no more polls should happen
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      // Still 3 calls - no additional polling after max retries
      expect(mockRefreshEligibility).toHaveBeenCalledTimes(3);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Max retries reached for missing country',
        expect.objectContaining({
          providerId: 'polymarket',
          retryCount: 3,
        }),
      );
    });

    it('does not start polling when country is already available', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true, country: 'US' },
      };

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDevLogger).not.toHaveBeenCalledWith(
        'PredictController: Country missing, auto-refreshing eligibility',
        expect.any(Object),
      );
    });

    it('continues polling after failed refresh', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true },
      };

      mockRefreshEligibility.mockRejectedValueOnce(new Error('Network error'));

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Auto-refresh for missing country failed',
        expect.objectContaining({
          error: 'Network error',
          retryCount: 1,
        }),
      );

      mockRefreshEligibility.mockResolvedValueOnce(undefined);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('logs unknown error when auto-refresh fails with non-Error', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true },
      };

      mockRefreshEligibility.mockRejectedValueOnce('string error');

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Auto-refresh for missing country failed',
        expect.objectContaining({
          error: 'Unknown',
          retryCount: 1,
        }),
      );
    });

    it('clears timeout on unmount', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true },
      };

      const { unmount } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

      await act(async () => {
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

    it('uses sequential polling pattern - waits for response before scheduling next poll', async () => {
      mockState.engine.backgroundState.PredictController.eligibility = {
        polymarket: { eligible: true },
      };

      let resolveRefresh: (() => void) | undefined;
      const refreshPromise = new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefreshEligibility.mockReturnValueOnce(refreshPromise);

      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      resolveRefresh?.();
      await act(async () => {
        await refreshPromise;
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });
  });
});
