import { renderHook, act } from '@testing-library/react-native';
import { TraceName, TraceOperation } from '../../util/trace';
import {
  OnboardingCtaIds,
  OnboardingRiveAnimationIds,
  OnboardingScreenIds,
} from './onboardingPerformanceIds';
import {
  _resetOnboardingNavigationPerformanceForTesting,
  startOnboardingCtaNavigation,
} from './onboardingNavigationPerformanceState';
import { useNavigationPerformance } from './useNavigationPerformance';
import { useRivePerformance } from './useRivePerformance';
import { useScreenPerformance } from './useScreenPerformance';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    OnboardingScreenTimeToContent: 'Onboarding Screen Time To Content',
    OnboardingScreenDataFetch: 'Onboarding Screen Data Fetch',
    OnboardingRiveReady: 'Onboarding Rive Ready',
    OnboardingCtaNavigation: 'Onboarding CTA Navigation',
  },
  TraceOperation: {
    OnboardingScreenPerformance: 'onboarding.screen.performance',
    OnboardingRivePerformance: 'onboarding.rive.performance',
    OnboardingNavigationPerformance: 'onboarding.navigation.performance',
  },
}));

jest.mock('./useRenderStormMonitor', () => ({
  useRenderStormMonitor: jest.fn(),
}));

const { trace: mockTrace, endTrace: mockEndTrace } =
  jest.requireMock('../../util/trace');

describe('onboarding performance hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetOnboardingNavigationPerformanceForTesting();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useScreenPerformance', () => {
    it('starts and ends a time-to-content trace', () => {
      const { rerender } = renderHook(
        ({ contentReady }) =>
          useScreenPerformance({
            screenId: OnboardingScreenIds.CHOOSE_PASSWORD,
            contentReady,
            isEmpty: false,
          }),
        { initialProps: { contentReady: false } },
      );

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingScreenTimeToContent,
          op: TraceOperation.OnboardingScreenPerformance,
        }),
      );

      rerender({ contentReady: true });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingScreenTimeToContent,
          data: expect.objectContaining({ success: true }),
        }),
      );
    });
  });

  describe('useRivePerformance', () => {
    it('records play and timeout outcomes', () => {
      const { result } = renderHook(() =>
        useRivePerformance({
          animationId: OnboardingRiveAnimationIds.FOX_LOADER,
          timeoutMs: 1000,
        }),
      );

      act(() => {
        result.current.riveHandlers.onPlay();
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ outcome: 'play' }),
        }),
      );

      jest.clearAllMocks();
      renderHook(() =>
        useRivePerformance({
          animationId: OnboardingRiveAnimationIds.FOX_LOADER,
          timeoutMs: 1000,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ outcome: 'timeout' }),
        }),
      );
    });
  });

  describe('useNavigationPerformance', () => {
    it('completes a pending CTA navigation span', () => {
      startOnboardingCtaNavigation(OnboardingCtaIds.CREATE_WALLET);

      renderHook(() =>
        useNavigationPerformance({
          destinationScreenId: OnboardingScreenIds.CHOOSE_PASSWORD,
          destinationReady: true,
        }),
      );

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingCtaNavigation,
          data: expect.objectContaining({
            cta_id: OnboardingCtaIds.CREATE_WALLET,
          }),
        }),
      );
    });
  });
});
