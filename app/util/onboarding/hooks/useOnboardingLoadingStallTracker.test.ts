import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { ONBOARDING_LOADING_STALL_MS } from '../onboardingLoadingStallTracking';
import { useOnboardingLoadingStallTracker } from './useOnboardingLoadingStallTracker';

const mockTrackEvent = jest.fn();
const mockIsEnabled = jest.fn(() => true);

jest.mock('../../analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    isEnabled: () => mockIsEnabled(),
  },
}));

describe('useOnboardingLoadingStallTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsEnabled.mockReturnValue(true);
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('tracks Onboarding Loading Stalled after 30s while still loading', () => {
    renderHook(() =>
      useOnboardingLoadingStallTracker({
        isLoading: true,
        screen: 'login',
        properties: { login_method: 'password' },
      }),
    );

    act(() => {
      jest.advanceTimersByTime(ONBOARDING_LOADING_STALL_MS);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.ONBOARDING_LOADING_STALLED.category,
        properties: expect.objectContaining({
          screen: 'login',
          elapsed_ms: ONBOARDING_LOADING_STALL_MS,
          app_state: 'active',
          login_method: 'password',
        }),
      }),
    );
  });

  it('does not track when loading ends before 30s', () => {
    const { rerender } = renderHook(
      ({ isLoading }: { isLoading: boolean }) =>
        useOnboardingLoadingStallTracker({
          isLoading,
          screen: 'create_password',
        }),
      { initialProps: { isLoading: true } },
    );

    act(() => {
      jest.advanceTimersByTime(ONBOARDING_LOADING_STALL_MS - 1);
    });
    rerender({ isLoading: false });
    act(() => {
      jest.advanceTimersByTime(ONBOARDING_LOADING_STALL_MS);
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks a single stall event when loading continues past 30s', () => {
    renderHook(() =>
      useOnboardingLoadingStallTracker({
        isLoading: true,
        screen: 'rehydration',
      }),
    );

    act(() => {
      jest.advanceTimersByTime(ONBOARDING_LOADING_STALL_MS * 2);
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
