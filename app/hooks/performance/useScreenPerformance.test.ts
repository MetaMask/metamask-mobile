import { renderHook, act } from '@testing-library/react-native';
import { TraceName, TraceOperation } from '../../util/trace';
import { OnboardingScreenIds } from './onboardingPerformanceIds';
import { useScreenPerformance } from './useScreenPerformance';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    OnboardingScreenTimeToContent: 'Onboarding Screen Time To Content',
    OnboardingScreenDataFetch: 'Onboarding Screen Data Fetch',
  },
  TraceOperation: {
    OnboardingScreenPerformance: 'onboarding.screen.performance',
  },
}));

jest.mock('./useRenderStormMonitor', () => ({
  useRenderStormMonitor: jest.fn(),
}));

const { trace: mockTrace, endTrace: mockEndTrace } =
  jest.requireMock('../../util/trace');

const defaultConfig = {
  screenId: OnboardingScreenIds.CHOOSE_PASSWORD,
  contentReady: false,
  isEmpty: false,
};

describe('useScreenPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts a time-to-content trace on mount', () => {
    renderHook(() => useScreenPerformance(defaultConfig));

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingScreenTimeToContent,
        op: TraceOperation.OnboardingScreenPerformance,
        tags: expect.objectContaining({
          screen_id: OnboardingScreenIds.CHOOSE_PASSWORD,
        }),
      }),
    );
  });

  it('ends the time-to-content trace when contentReady flips to true', () => {
    const { rerender } = renderHook(
      ({ contentReady }) =>
        useScreenPerformance({ ...defaultConfig, contentReady }),
      { initialProps: { contentReady: false } },
    );

    rerender({ contentReady: true });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingScreenTimeToContent,
        data: expect.objectContaining({
          success: true,
          screen_id: OnboardingScreenIds.CHOOSE_PASSWORD,
          content_state: 'filled',
        }),
      }),
    );
  });

  it('ends an in-flight trace as unmounted on cleanup', () => {
    const { unmount } = renderHook(() => useScreenPerformance(defaultConfig));

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

  it('skips tracing when enabled is false', () => {
    renderHook(() =>
      useScreenPerformance({ ...defaultConfig, enabled: false }),
    );

    expect(mockTrace).not.toHaveBeenCalled();
  });
});
