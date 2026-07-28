import { renderHook, act } from '@testing-library/react-native';
import { TraceName, TraceOperation } from '../../util/trace';
import {
  OnboardingCtaIds,
  OnboardingRiveAnimationIds,
  OnboardingScreenIds,
} from './onboardingPerformanceIds';
import {
  _resetOnboardingNavigationPerformanceForTesting,
  cancelPendingOnboardingCtaNavigation,
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

    it('does not start a trace when disabled', () => {
      renderHook(() =>
        useScreenPerformance({
          screenId: OnboardingScreenIds.CHOOSE_PASSWORD,
          contentReady: false,
          isEmpty: false,
          enabled: false,
        }),
      );

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('ends the trace as unmounted when disabled before content is ready', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useScreenPerformance({
            screenId: OnboardingScreenIds.ONBOARDING_LANDING,
            contentReady: false,
            isEmpty: false,
            enabled,
          }),
        { initialProps: { enabled: true } },
      );

      rerender({ enabled: false });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingScreenTimeToContent,
          data: expect.objectContaining({
            success: false,
            reason: 'unmounted',
          }),
        }),
      );
    });

    it('records a data-fetch span for the first loading cycle', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useScreenPerformance({
            screenId: OnboardingScreenIds.IMPORT_SRP,
            contentReady: true,
            isEmpty: false,
            isLoading,
          }),
        { initialProps: { isLoading: false } },
      );

      rerender({ isLoading: true });
      rerender({ isLoading: false });

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingScreenDataFetch,
        }),
      );
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingScreenDataFetch,
          data: expect.objectContaining({ success: true }),
        }),
      );
    });

    it('ends the trace as unmounted on cleanup before content is ready', () => {
      const { unmount } = renderHook(() =>
        useScreenPerformance({
          screenId: OnboardingScreenIds.CHOOSE_PASSWORD,
          contentReady: false,
          isEmpty: false,
        }),
      );

      unmount();

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingScreenTimeToContent,
          data: expect.objectContaining({
            success: false,
            reason: 'unmounted',
          }),
        }),
      );
    });
  });

  describe('useRivePerformance', () => {
    it('records a play outcome', () => {
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
    });

    it('records a timeout outcome', () => {
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

    it('records an error outcome', () => {
      const { result } = renderHook(() =>
        useRivePerformance({
          animationId: OnboardingRiveAnimationIds.FOX_LOADER,
          timeoutMs: 1000,
        }),
      );

      act(() => {
        result.current.riveHandlers.onError({
          message: 'Rive failed',
          type: 'load_error',
        });
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ outcome: 'error' }),
        }),
      );
    });

    it('does not start a trace when disabled', () => {
      renderHook(() =>
        useRivePerformance({
          animationId: OnboardingRiveAnimationIds.FOX_LOADER,
          enabled: false,
        }),
      );

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('ends the trace as unmounted on cleanup', () => {
      const { unmount } = renderHook(() =>
        useRivePerformance({
          animationId: OnboardingRiveAnimationIds.FOX_LOADER,
          timeoutMs: 1000,
        }),
      );

      unmount();

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ outcome: 'unmounted' }),
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

    it('cancels a pending span when the destination unmounts before ready', () => {
      startOnboardingCtaNavigation(OnboardingCtaIds.CREATE_WALLET);

      const { unmount } = renderHook(() =>
        useNavigationPerformance({
          destinationScreenId: OnboardingScreenIds.CHOOSE_PASSWORD,
          destinationReady: false,
        }),
      );

      unmount();

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingCtaNavigation,
          data: expect.objectContaining({
            success: false,
            reason: 'unmounted',
          }),
        }),
      );
    });

    it('does nothing when disabled', () => {
      startOnboardingCtaNavigation(OnboardingCtaIds.CREATE_WALLET);

      renderHook(() =>
        useNavigationPerformance({
          destinationScreenId: OnboardingScreenIds.CHOOSE_PASSWORD,
          destinationReady: true,
          enabled: false,
        }),
      );

      expect(mockEndTrace).not.toHaveBeenCalled();
    });
  });

  describe('startOnboardingCtaNavigation', () => {
    it('supersedes an existing pending navigation span', () => {
      startOnboardingCtaNavigation(OnboardingCtaIds.CREATE_WALLET);
      jest.clearAllMocks();

      startOnboardingCtaNavigation(OnboardingCtaIds.IMPORT_WALLET);

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingCtaNavigation,
          data: expect.objectContaining({
            success: false,
            reason: 'superseded',
            cta_id: OnboardingCtaIds.CREATE_WALLET,
          }),
        }),
      );
      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            cta_id: OnboardingCtaIds.IMPORT_WALLET,
          }),
        }),
      );
    });

    it('cancels a pending navigation span with a reason', () => {
      startOnboardingCtaNavigation(OnboardingCtaIds.SOCIAL_LOGIN_GOOGLE);

      cancelPendingOnboardingCtaNavigation('social_login_failed');

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            success: false,
            reason: 'social_login_failed',
          }),
        }),
      );
    });
  });
});
