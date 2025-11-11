import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { usePredictEligibility } from './usePredictEligibility';

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

  describe('AppState listener setup', () => {
    it('sets up AppState listener on mount', () => {
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      expect(mockAppStateAddEventListener).toHaveBeenCalledTimes(1);
      expect(mockAppStateAddEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });

    it('removes AppState listener on unmount', () => {
      const { unmount } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

      unmount();

      expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);
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
          providerId: 'polymarket',
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
    it('skips refresh when less than 1 minute has passed', async () => {
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(30000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockDevLogger).toHaveBeenCalledWith(
        'PredictController: Skipping refresh due to debounce',
        expect.objectContaining({
          providerId: 'polymarket',
          timeSinceLastRefresh: expect.any(Number),
          minimumInterval: 60000,
        }),
      );
    });

    it('allows refresh when 1 minute has elapsed', async () => {
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('allows refresh when more than 1 minute has elapsed', async () => {
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(120000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });

    it('resets debounce timer after successful refresh', async () => {
      renderHook(() => usePredictEligibility({ providerId: 'polymarket' }));

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(30000);

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
      const { result } = renderHook(() =>
        usePredictEligibility({ providerId: 'polymarket' }),
      );

      const handleAppStateChange = mockAppStateAddEventListener.mock
        .calls[0][1] as (nextState: AppStateStatus) => void;

      await act(async () => {
        await result.current.refreshEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(30000);

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
          providerId: 'polymarket',
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
          providerId: 'polymarket',
          error: 'Unknown',
        }),
      );
    });

    it('continues operation after failed refresh', async () => {
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
      jest.advanceTimersByTime(60000);

      await act(async () => {
        handleAppStateChange('background');
        handleAppStateChange('active');
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(2);
    });
  });
});
