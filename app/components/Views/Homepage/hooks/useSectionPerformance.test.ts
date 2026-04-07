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

let mockPerfNowValue = 0;
jest.mock('react-native-performance', () => ({
  now: jest.fn(() => mockPerfNowValue),
}));

const { trace: mockTrace, endTrace: mockEndTrace } = jest.requireMock(
  '../../../../util/trace',
);
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

    it('starts a fetch trace when isLoading starts as true', () => {
      renderHook(() =>
        useSectionPerformance({ ...defaultConfig, isLoading: true }),
      );

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.HomepageSectionDataFetch,
          op: TraceOperation.HomepageSectionPerformance,
          tags: { section_id: HomeSectionNames.TOKENS },
        }),
      );
    });

    it('ends the fetch trace when isLoading transitions from true to false', () => {
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

    it('does not end the fetch trace if isLoading was never true', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useSectionPerformance({ ...defaultConfig, isLoading }),
        { initialProps: { isLoading: false } },
      );

      rerender({ isLoading: false });

      const fetchEndCalls = (mockEndTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      expect(fetchEndCalls).toHaveLength(0);
    });

    it('only tracks the first fetch cycle', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useSectionPerformance({ ...defaultConfig, isLoading }),
        { initialProps: { isLoading: true } },
      );

      rerender({ isLoading: false });
      jest.clearAllMocks();

      // Second loading cycle — should not start a new trace
      rerender({ isLoading: true });

      const fetchTraceCalls = (mockTrace as jest.Mock).mock.calls.filter(
        (call: [{ name: string }]) =>
          call[0].name === TraceName.HomepageSectionDataFetch,
      );
      expect(fetchTraceCalls).toHaveLength(0);
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
          category: 'homepage.section.performance',
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
  });
});
