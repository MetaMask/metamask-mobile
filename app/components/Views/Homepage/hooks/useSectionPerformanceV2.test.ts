import { act, renderHook } from '@testing-library/react-native';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { HomepageEntryPoints } from '../context/HomepageScrollContext';
import { useHomepageSectionPerformanceContext } from '../performance/HomepageSectionPerformanceContext';
import { HomeSectionNames } from './useHomeViewedEvent';
import {
  HOMEPAGE_SECTION_PERFORMANCE_V2_TIMEOUT_MS,
  useSectionPerformanceV2,
} from './useSectionPerformanceV2';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    HomepageSectionTimeToContentV2: 'Homepage Section Time To Content V2',
    HomepageSectionDataReadyV2: 'Homepage Section Data Ready V2',
  },
  TraceOperation: {
    HomepageSectionPerformanceV2: 'homepage.section.performance.v2',
  },
}));

jest.mock('../context/HomepageScrollContext', () => ({
  HomepageEntryPoints: {
    APP_OPENED: 'app_opened',
  },
  useHomepageScrollContext: () => ({
    appSessionId: 'app-session-id',
    entryPoint: 'app_opened',
    visitId: 1,
  }),
}));

jest.mock('../performance/HomepageSectionPerformanceContext', () => ({
  useHomepageSectionPerformanceContext: jest.fn(),
}));

const mockTrace = trace as jest.MockedFunction<typeof trace>;
const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
const mockUseHomepageSectionPerformanceContext =
  useHomepageSectionPerformanceContext as jest.MockedFunction<
    typeof useHomepageSectionPerformanceContext
  >;

const activeSession = {
  id: 'homepage-performance-session-id',
  startTime: 1234,
  trigger: 'app_open' as const,
};

const defaultConfig = {
  sectionId: HomeSectionNames.TOKENS,
  contentReady: false,
  isEmpty: false,
  isLoading: true,
};

describe('useSectionPerformanceV2', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseHomepageSectionPerformanceContext.mockReturnValue({
      activeSession,
      claimPendingSession: jest.fn(),
      releaseSession: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts V2 content and data spans at the claimed session start time', () => {
    renderHook(() => useSectionPerformanceV2(defaultConfig));

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.HomepageSectionTimeToContentV2,
        op: TraceOperation.HomepageSectionPerformanceV2,
        startTime: activeSession.startTime,
        tags: expect.objectContaining({
          instrumentation_version: '2',
          section_id: HomeSectionNames.TOKENS,
          session_trigger: activeSession.trigger,
          homepage_perf_session_id: activeSession.id,
          app_session_id: 'app-session-id',
          entry_point: HomepageEntryPoints.APP_OPENED,
          visit_id: 1,
        }),
      }),
    );
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.HomepageSectionDataReadyV2,
        startTime: activeSession.startTime,
      }),
    );
  });

  it('does not start when no homepage performance session is active', () => {
    mockUseHomepageSectionPerformanceContext.mockReturnValue({
      activeSession: null,
      claimPendingSession: jest.fn(),
      releaseSession: jest.fn(),
    });

    renderHook(() => useSectionPerformanceV2(defaultConfig));

    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('waits for meaningful layout before ending time to content', () => {
    const { rerender, result } = renderHook(
      ({ contentReady }) =>
        useSectionPerformanceV2({ ...defaultConfig, contentReady }),
      { initialProps: { contentReady: false } },
    );

    rerender({ contentReady: true });
    expect(mockEndTrace).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.HomepageSectionTimeToContentV2,
      }),
    );

    act(() => {
      result.current.onContentLayout({
        nativeEvent: { layout: { height: 20 } },
      } as never);
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.HomepageSectionTimeToContentV2,
        data: expect.objectContaining({
          success: true,
          content_state: 'filled',
          section_id: HomeSectionNames.TOKENS,
        }),
      }),
    );
  });

  it('ends data ready independently from content layout', () => {
    const { rerender } = renderHook(
      ({ isLoading }) =>
        useSectionPerformanceV2({ ...defaultConfig, isLoading }),
      { initialProps: { isLoading: true } },
    );

    rerender({ isLoading: false });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.HomepageSectionDataReadyV2,
        data: expect.objectContaining({
          success: true,
          content_state: 'filled',
        }),
      }),
    );
  });

  it('ends hidden empty content without waiting for layout', () => {
    renderHook(() =>
      useSectionPerformanceV2({
        ...defaultConfig,
        contentReady: true,
        isEmpty: true,
        dataReady: true,
        requiresLayout: false,
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.HomepageSectionTimeToContentV2,
        data: expect.objectContaining({
          content_state: 'empty',
          reason: 'hidden_empty',
        }),
      }),
    );
  });

  it('tags error terminal states as unsuccessful with reason error', () => {
    const { result } = renderHook(() =>
      useSectionPerformanceV2({
        ...defaultConfig,
        contentReady: true,
        dataReady: true,
        contentStateForTrace: 'error',
      }),
    );

    act(() => {
      result.current.onContentLayout({
        nativeEvent: { layout: { height: 20 } },
      } as never);
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          content_state: 'error',
          reason: 'error',
        }),
      }),
    );
  });

  it('times out unfinished spans after the V2 timeout window', () => {
    renderHook(() => useSectionPerformanceV2(defaultConfig));

    act(() => {
      jest.advanceTimersByTime(HOMEPAGE_SECTION_PERFORMANCE_V2_TIMEOUT_MS);
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.HomepageSectionTimeToContentV2,
        data: expect.objectContaining({
          success: false,
          reason: 'timeout',
        }),
      }),
    );
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.HomepageSectionDataReadyV2,
        data: expect.objectContaining({
          success: false,
          reason: 'timeout',
        }),
      }),
    );
  });
});
