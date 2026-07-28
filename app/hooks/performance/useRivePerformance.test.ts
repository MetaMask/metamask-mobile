import { renderHook, act } from '@testing-library/react-native';
import { TraceName, TraceOperation } from '../../util/trace';
import { OnboardingRiveAnimationIds } from './onboardingPerformanceIds';
import { useRivePerformance } from './useRivePerformance';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    OnboardingRiveReady: 'Onboarding Rive Ready',
  },
  TraceOperation: {
    OnboardingRivePerformance: 'onboarding.rive.performance',
  },
}));

const { trace: mockTrace, endTrace: mockEndTrace } =
  jest.requireMock('../../util/trace');

describe('useRivePerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts a Rive readiness trace on mount', () => {
    renderHook(() =>
      useRivePerformance({
        animationId: OnboardingRiveAnimationIds.FOX_LOADER,
      }),
    );

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingRiveReady,
        op: TraceOperation.OnboardingRivePerformance,
        tags: expect.objectContaining({
          animation_id: OnboardingRiveAnimationIds.FOX_LOADER,
        }),
      }),
    );
  });

  it('ends the trace with play outcome when onPlay fires', () => {
    const { result } = renderHook(() =>
      useRivePerformance({
        animationId: OnboardingRiveAnimationIds.FOX_LOADER,
      }),
    );

    act(() => {
      result.current.riveHandlers.onPlay();
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingRiveReady,
        data: expect.objectContaining({
          success: true,
          outcome: 'play',
          animation_id: OnboardingRiveAnimationIds.FOX_LOADER,
        }),
      }),
    );
  });

  it('ends the trace with error outcome when onError fires', () => {
    const { result } = renderHook(() =>
      useRivePerformance({
        animationId: OnboardingRiveAnimationIds.ONBOARDING_WORDMARK,
      }),
    );

    act(() => {
      result.current.riveHandlers.onError({
        message: 'failed',
        type: 'runtime',
      });
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          outcome: 'error',
          error_type: 'runtime',
        }),
      }),
    );
  });

  it('ends the trace with timeout outcome when timeout elapses', () => {
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
        data: expect.objectContaining({
          success: false,
          outcome: 'timeout',
        }),
      }),
    );
  });

  it('ends the trace as unmounted on cleanup', () => {
    const { unmount } = renderHook(() =>
      useRivePerformance({
        animationId: OnboardingRiveAnimationIds.FOX_APPEAR,
      }),
    );

    unmount();

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          reason: 'unmounted',
          outcome: 'unmounted',
        }),
      }),
    );
  });
});
