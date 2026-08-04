import { renderHook } from '@testing-library/react-native';
import { addBreadcrumb } from '@sentry/react-native';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { HomeSectionNames } from './useHomeViewedEvent';
import { useSectionPerformance } from './useSectionPerformance';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    HomepageSectionTimeToContent: 'Homepage Section Time To Content',
    HomepageSectionDataFetch: 'Homepage Section Data Fetch',
  },
  TraceOperation: {
    HomepageSectionPerformance: 'homepage.section.performance',
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

let mockPerfNowValue = 0;
jest.mock('react-native-performance', () => ({
  now: jest.fn(() => mockPerfNowValue),
}));

const { trace: mockTrace, endTrace: mockEndTrace } = jest.requireMock(
  '../../../../util/trace',
);
const mockDevLoggerLog = jest.requireMock(
  '../../../../core/SDKConnect/utils/DevLogger',
).default.log as jest.Mock;
const mockAddBreadcrumb = addBreadcrumb as jest.MockedFunction<
  typeof addBreadcrumb
>;

const defaultConfig = {
  sectionId: HomeSectionNames.TOKENS,
  contentReady: false,
  isEmpty: false,
};

describe('useSectionPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerfNowValue = 0;
  });

  describe('Time to Content', () => {
    it('starts a trace on mount', () => {
      renderHook(() => useSectionPerformance(defaultConfig));

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionTimeToContent,
          op: TraceOperation.HomepageSectionPerformance,
          tags: { section_id: HomeSectionNames.TOKENS },
        }),
      );
    });

    it('ends the trace when contentReady flips to true', () => {
      const { rerender } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({ ...defaultConfig, contentReady }),
        { initialProps: { contentReady: false } },
      );

      expect(mockEndTrace).not.toHaveBeenCalled();

      rerender({ contentReady: true });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionTimeToContent,
          data: expect.objectContaining({
            success: true,
            section_id: HomeSectionNames.TOKENS,
            content_state: 'filled',
          }),
        }),
      );
    });

    it('tags content_state from contentStateForTrace when provided', () => {
      const { rerender } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({
            ...defaultConfig,
            contentReady,
            contentStateForTrace: 'error',
            isEmpty: false,
          }),
        { initialProps: { contentReady: false } },
      );

      rerender({ contentReady: true });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionTimeToContent,
          data: expect.objectContaining({ content_state: 'error' }),
        }),
      );
    });

    it('tags content_state as empty when isEmpty is true', () => {
      const { rerender } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({
            ...defaultConfig,
            contentReady,
            isEmpty: true,
          }),
        { initialProps: { contentReady: false } },
      );

      rerender({ contentReady: true });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content_state: 'empty' }),
        }),
      );
    });

    it('ends the trace only once even with multiple re-renders', () => {
      const { rerender } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({ ...defaultConfig, contentReady }),
        { initialProps: { contentReady: false } },
      );

      rerender({ contentReady: true });
      rerender({ contentReady: true });
      rerender({ contentReady: true });

      const ttcEndCalls = (mockEndTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionTimeToContent,
      );
      expect(ttcEndCalls).toHaveLength(1);
    });

    it('ends with failure data when unmounted before content is ready', () => {
      const { unmount } = renderHook(() =>
        useSectionPerformance(defaultConfig),
      );

      unmount();

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionTimeToContent,
          data: expect.objectContaining({
            success: false,
            reason: 'unmounted',
          }),
        }),
      );
    });

    it('does not end with failure on unmount if content was already ready', () => {
      const { rerender, unmount } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({ ...defaultConfig, contentReady }),
        { initialProps: { contentReady: false } },
      );

      rerender({ contentReady: true });
      jest.clearAllMocks();

      unmount();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });
  });

  describe('Data Fetch Latency', () => {
    it('does not start a fetch trace when isLoading is not provided', () => {
      renderHook(() => useSectionPerformance(defaultConfig));

      const fetchTraceCalls = (mockTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      expect(fetchTraceCalls).toHaveLength(0);
    });

    it('starts the data fetch span at mount when the section is still loading', () => {
      renderHook(() =>
        useSectionPerformance({ ...defaultConfig, isLoading: true }),
      );

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionDataFetch,
          op: TraceOperation.HomepageSectionPerformance,
          tags: {
            section_id: HomeSectionNames.TOKENS,
            loading_at_span_open: true,
          },
        }),
      );
    });

    it('ends the data fetch span on the first render after loading completes', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useSectionPerformance({ ...defaultConfig, isLoading }),
        { initialProps: { isLoading: true } },
      );

      rerender({ isLoading: false });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionDataFetch,
          data: expect.objectContaining({
            success: true,
            section_id: HomeSectionNames.TOKENS,
          }),
        }),
      );
    });

    it('opens and closes the data fetch span at mount when the section is already loaded', () => {
      renderHook(() =>
        useSectionPerformance({ ...defaultConfig, isLoading: false }),
      );

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionDataFetch,
          op: TraceOperation.HomepageSectionPerformance,
          tags: {
            section_id: HomeSectionNames.TOKENS,
            loading_at_span_open: false,
          },
        }),
      );
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionDataFetch,
          data: expect.objectContaining({
            success: true,
            section_id: HomeSectionNames.TOKENS,
          }),
        }),
      );
    });

    it('ignores a loading cycle that begins after mount', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useSectionPerformance({ ...defaultConfig, isLoading }),
        { initialProps: { isLoading: false } },
      );

      jest.clearAllMocks();

      rerender({ isLoading: true });
      rerender({ isLoading: false });

      const fetchTraceCalls = (mockTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      const fetchEndCalls = (mockEndTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      expect(fetchTraceCalls).toHaveLength(0);
      expect(fetchEndCalls).toHaveLength(0);
    });

    it('ends the data fetch span once on the first non-loading render', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useSectionPerformance({ ...defaultConfig, isLoading }),
        { initialProps: { isLoading: true } },
      );

      rerender({ isLoading: false });
      rerender({ isLoading: false });

      const fetchEndCalls = (mockEndTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      expect(fetchEndCalls).toHaveLength(1);
      expect(fetchEndCalls[0][0].data).toEqual(
        expect.objectContaining({
          success: true,
          section_id: HomeSectionNames.TOKENS,
          content_state: 'filled',
        }),
      );
    });

    it('ignores a second loading cycle after a cold mount span closed', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useSectionPerformance({ ...defaultConfig, isLoading }),
        { initialProps: { isLoading: true } },
      );

      rerender({ isLoading: false });
      jest.clearAllMocks();

      // Second loading cycle — must not start a new span
      rerender({ isLoading: true });

      const fetchTraceCalls = (mockTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      expect(fetchTraceCalls).toHaveLength(0);
    });

    it('does not reopen the data fetch span when enabled toggles back on after the span closed', () => {
      const { rerender } = renderHook(
        ({ enabled, isLoading }) =>
          useSectionPerformance({ ...defaultConfig, enabled, isLoading }),
        { initialProps: { enabled: true, isLoading: true } },
      );

      rerender({ enabled: true, isLoading: false });
      jest.clearAllMocks();

      rerender({ enabled: false, isLoading: false });
      rerender({ enabled: true, isLoading: true });

      const fetchTraceCalls = (mockTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      expect(fetchTraceCalls).toHaveLength(0);
    });

    it('does not reopen the data fetch span when enabled toggles back on while still loading', () => {
      const { rerender } = renderHook(
        ({ enabled, isLoading }) =>
          useSectionPerformance({ ...defaultConfig, enabled, isLoading }),
        { initialProps: { enabled: true, isLoading: true } },
      );

      jest.clearAllMocks();

      rerender({ enabled: false, isLoading: true });
      rerender({ enabled: true, isLoading: true });

      const fetchTraceCalls = (mockTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      expect(fetchTraceCalls).toHaveLength(0);
    });

    it('tags the span with the loading state at open when a flag enables the section after loading finished', () => {
      const { rerender } = renderHook(
        ({ enabled, isLoading }) =>
          useSectionPerformance({ ...defaultConfig, enabled, isLoading }),
        { initialProps: { enabled: false, isLoading: true } },
      );

      rerender({ enabled: false, isLoading: false });
      rerender({ enabled: true, isLoading: false });

      const fetchTraceCalls = (mockTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      expect(fetchTraceCalls).toHaveLength(1);
      expect(fetchTraceCalls[0][0].tags).toEqual({
        section_id: HomeSectionNames.TOKENS,
        loading_at_span_open: false,
      });
      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        '[homepage.section.performance] data_fetch start section=tokens phase=enabled loading_at_span_open=false',
      );
    });

    it('ends the fetch trace with failure on unmount if still loading', () => {
      const { unmount } = renderHook(() =>
        useSectionPerformance({ ...defaultConfig, isLoading: true }),
      );

      unmount();

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionDataFetch,
          data: expect.objectContaining({
            success: false,
            reason: 'unmounted',
          }),
        }),
      );
    });
  });

  // The validation recipe greps these exact strings out of Metro to prove the
  // span boundary on a live device (artifacts/recipe.json). Pin the grammar
  // here so a field rename cannot pass CI while silently voiding that proof.
  describe('Data Fetch dev log grammar', () => {
    it('logs the mount span open with the section and the loading state at open', () => {
      renderHook(() =>
        useSectionPerformance({ ...defaultConfig, isLoading: false }),
      );

      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        '[homepage.section.performance] data_fetch start section=tokens phase=mount loading_at_span_open=false',
      );
    });

    it('logs the span close with the success and content state', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useSectionPerformance({ ...defaultConfig, isLoading }),
        { initialProps: { isLoading: true } },
      );

      rerender({ isLoading: false });

      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        '[homepage.section.performance] data_fetch end section=tokens success=true content_state=filled',
      );
    });

    it('logs the skipped reload once when loading restarts after the span closed', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useSectionPerformance({ ...defaultConfig, isLoading }),
        { initialProps: { isLoading: false } },
      );

      rerender({ isLoading: true });
      rerender({ isLoading: false });
      rerender({ isLoading: true });

      const skipCalls = mockDevLoggerLog.mock.calls.filter((call: [string]) =>
        call[0].includes('data_fetch skip'),
      );
      expect(skipCalls).toEqual([
        [
          '[homepage.section.performance] data_fetch skip section=tokens reason=post_mount_reload',
        ],
      ]);
    });
  });

  describe('Re-render Monitoring', () => {
    it('does not log a breadcrumb when renders are within the threshold', () => {
      const { rerender } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({
            ...defaultConfig,
            contentReady,
            reRenderThreshold: 5,
            reRenderWindowMs: 500,
          }),
        { initialProps: { contentReady: false } },
      );

      // 3 renders total (initial + 2 rerenders) — within threshold of 5
      rerender({ contentReady: false });
      rerender({ contentReady: false });

      expect(mockAddBreadcrumb).not.toHaveBeenCalled();
    });

    it('logs a breadcrumb when renders exceed the threshold within the window', () => {
      mockPerfNowValue = 100;

      const { rerender } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({
            ...defaultConfig,
            contentReady,
            reRenderThreshold: 3,
            reRenderWindowMs: 500,
          }),
        { initialProps: { contentReady: false } },
      );

      // Renders 2-4 within the same time window
      mockPerfNowValue = 150;
      rerender({ contentReady: false });
      mockPerfNowValue = 200;
      rerender({ contentReady: false });
      mockPerfNowValue = 250;
      rerender({ contentReady: false });

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: TraceOperation.HomepageSectionPerformance,
          level: 'warning',
          data: expect.objectContaining({
            section_id: HomeSectionNames.TOKENS,
          }),
        }),
      );
    });

    it('only logs the breadcrumb once per hook lifecycle', () => {
      mockPerfNowValue = 100;

      const { rerender } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({
            ...defaultConfig,
            contentReady,
            reRenderThreshold: 2,
            reRenderWindowMs: 1000,
          }),
        { initialProps: { contentReady: false } },
      );

      // Exceed threshold
      mockPerfNowValue = 150;
      rerender({ contentReady: false });
      mockPerfNowValue = 200;
      rerender({ contentReady: false });

      // Keep re-rendering
      mockPerfNowValue = 250;
      rerender({ contentReady: false });
      mockPerfNowValue = 300;
      rerender({ contentReady: false });

      expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    });

    it('does not log when renders are spread outside the window', () => {
      mockPerfNowValue = 0;

      const { rerender } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({
            ...defaultConfig,
            contentReady,
            reRenderThreshold: 3,
            reRenderWindowMs: 500,
          }),
        { initialProps: { contentReady: false } },
      );

      // Each render far apart — older entries get pruned
      mockPerfNowValue = 600;
      rerender({ contentReady: false });
      mockPerfNowValue = 1200;
      rerender({ contentReady: false });
      mockPerfNowValue = 1800;
      rerender({ contentReady: false });

      expect(mockAddBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('enabled flag', () => {
    it('does not start any traces when enabled is false', () => {
      renderHook(() =>
        useSectionPerformance({
          ...defaultConfig,
          enabled: false,
          isLoading: true,
        }),
      );

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('does not log breadcrumbs when enabled is false', () => {
      mockPerfNowValue = 100;

      const { rerender } = renderHook(
        ({ contentReady }) =>
          useSectionPerformance({
            ...defaultConfig,
            contentReady,
            enabled: false,
            reRenderThreshold: 2,
            reRenderWindowMs: 1000,
          }),
        { initialProps: { contentReady: false } },
      );

      mockPerfNowValue = 110;
      rerender({ contentReady: false });
      mockPerfNowValue = 120;
      rerender({ contentReady: false });
      mockPerfNowValue = 130;
      rerender({ contentReady: false });

      expect(mockAddBreadcrumb).not.toHaveBeenCalled();
    });

    it('does not end traces on unmount when enabled is false', () => {
      const { unmount } = renderHook(() =>
        useSectionPerformance({ ...defaultConfig, enabled: false }),
      );

      unmount();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('ends TTC with success when enabled becomes true while contentReady is already true', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useSectionPerformance({
            ...defaultConfig,
            contentReady: true,
            enabled,
          }),
        { initialProps: { enabled: false } },
      );

      expect(mockTrace).not.toHaveBeenCalled();
      expect(mockEndTrace).not.toHaveBeenCalled();

      rerender({ enabled: true });

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionTimeToContent,
        }),
      );
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionTimeToContent,
          data: expect.objectContaining({
            success: true,
            section_id: HomeSectionNames.TOKENS,
            content_state: 'filled',
          }),
        }),
      );
    });
  });
});
