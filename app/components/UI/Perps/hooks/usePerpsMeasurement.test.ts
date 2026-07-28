import { renderHook } from '@testing-library/react-native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { usePerpsMeasurement } from './usePerpsMeasurement';
import {
  getPerpsLifecycleContext,
  resetPerpsLifecycleContextForTests,
  PERPS_LIFECYCLE_CONTEXT,
} from '../utils/perpsLifecycleContext';

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    PerpsPositionDetailsView: 'Perps Position Details View',
    PerpsOrderView: 'Perps Order View',
    PerpsClosePositionView: 'Perps Close Position View',
    PerpsEntryToLiveMarketList: 'Perps Entry To Live Market List',
    PerpsMarketDetailLive: 'Perps Market Detail Live',
    PerpsTradePageRender: 'Perps Trade Page Render',
  },
  TraceOperation: {
    PerpsOperation: 'perps.operation',
    PerpsOrderSubmission: 'perps.order_submission',
  },
}));

jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
}));

jest.mock('react-native-performance', () => ({
  timeOrigin: 0,
  now: jest.fn(),
}));

// Get mock functions
const { trace: mockTrace, endTrace: mockEndTrace } = jest.requireMock(
  '../../../../util/trace',
);
const mockDevLogger = DevLogger.log as jest.MockedFunction<
  typeof DevLogger.log
>;

describe('usePerpsMeasurement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('simple API with conditions', () => {
    it('should start immediately and end when conditions are met', () => {
      const { rerender } = renderHook(
        ({ conditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsPositionDetailsView,
            conditions,
          }),
        {
          initialProps: { conditions: [false, false] },
        },
      );

      // Should start trace immediately with simple API
      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PerpsPositionDetailsView,
          op: TraceOperation.PerpsOperation, // Default op
        }),
      );

      // Complete when all conditions are true
      rerender({ conditions: [true, true] });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PerpsPositionDetailsView,
          data: { success: true },
        }),
      );
    });

    it('should auto-reset when first condition becomes false', () => {
      jest.clearAllMocks();

      const { rerender } = renderHook(
        ({ conditions, resetConditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsOrderView,
            conditions,
            resetConditions, // Explicitly control reset for this test
            debugContext: { asset: 'BTC' },
          }),
        {
          initialProps: {
            conditions: [true, false],
            resetConditions: [false],
          },
        },
      );

      // Should start trace immediately
      expect(mockTrace).toHaveBeenCalledTimes(1);

      // Trigger reset before completion
      rerender({ conditions: [true, false], resetConditions: [true] });

      // Should end trace with reset reason
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { success: false, reason: 'reset' },
        }),
      );

      // Should be able to start again after reset
      rerender({ conditions: [true, false], resetConditions: [false] });

      // Trace should have been started twice (initial + after reset)
      expect(mockTrace).toHaveBeenCalledTimes(2);

      // Complete measurement after restart
      rerender({ conditions: [true, true], resetConditions: [false] });

      expect(mockEndTrace).toHaveBeenCalledTimes(2);
      expect(mockEndTrace).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: { success: true },
        }),
      );
    });
  });

  describe('advanced API with explicit conditions', () => {
    it('should start measurement immediately when no start conditions provided', () => {
      const { rerender } = renderHook(
        ({ endConditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsPositionDetailsView,
            endConditions,
          }),
        {
          initialProps: { endConditions: [false, false] },
        },
      );

      // Should start trace immediately
      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PerpsPositionDetailsView,
        }),
      );

      // Complete measurement when all end conditions are true
      rerender({ endConditions: [true, true] });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PerpsPositionDetailsView,
          data: { success: true },
        }),
      );
      expect(mockDevLogger).toHaveBeenCalledWith(
        expect.stringContaining('completed'),
        expect.objectContaining({
          metric: TraceName.PerpsPositionDetailsView,
        }),
      );
    });

    it('does not reset or restart across loading re-renders (measures mount -> ready)', () => {
      jest.clearAllMocks();

      // Simulate a CUF span: start at mount, several re-renders while the first
      // end-condition is still false (loading), then readiness. The span must
      // start exactly once and never end as `reset`, so its duration spans the
      // whole mount -> ready window rather than restarting near readiness.
      const { rerender } = renderHook(
        ({ endConditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsEntryToLiveMarketList,
            endConditions,
            // Fresh endData ref each render (as the real views pass), which
            // forces the effect to re-run every render.
            endData: { variant: 'empty' },
          }),
        { initialProps: { endConditions: [false, false] } },
      );

      // Re-render repeatedly while still loading (new array each time).
      rerender({ endConditions: [false, false] });
      rerender({ endConditions: [true, false] });
      rerender({ endConditions: [false, false] });

      // Started once, never reset.
      expect(mockTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).not.toHaveBeenCalled();

      // Readiness: ends once as a success.
      rerender({ endConditions: [true, true] });
      expect(mockTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PerpsEntryToLiveMarketList,
          data: { success: true, variant: 'empty' },
        }),
      );
    });

    it('should wait for start conditions before beginning measurement', () => {
      jest.clearAllMocks();

      const { rerender } = renderHook(
        ({ startConditions, endConditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsOrderView,
            startConditions,
            endConditions,
          }),
        {
          initialProps: {
            startConditions: [false],
            endConditions: [false, false],
          },
        },
      );

      // Should not start yet
      expect(mockTrace).not.toHaveBeenCalled();

      // Start when start conditions are met
      rerender({
        startConditions: [true],
        endConditions: [false, false],
      });

      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('should handle reset conditions', () => {
      const { rerender } = renderHook(
        ({ startConditions, endConditions, resetConditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsOrderView,
            startConditions,
            endConditions,
            resetConditions,
          }),
        {
          initialProps: {
            startConditions: [true],
            endConditions: [false],
            resetConditions: [false],
          },
        },
      );

      // Should start
      expect(mockTrace).toHaveBeenCalledTimes(1);

      // Reset measurement
      rerender({
        startConditions: [true],
        endConditions: [false],
        resetConditions: [true],
      });

      // Should end with reset
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { success: false, reason: 'reset' },
        }),
      );

      // Should be able to start again after reset
      rerender({
        startConditions: [false],
        endConditions: [false],
        resetConditions: [false],
      });
      rerender({
        startConditions: [true],
        endConditions: [false],
        resetConditions: [false],
      });

      expect(mockTrace).toHaveBeenCalledTimes(2);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple start and end conditions', () => {
      jest.clearAllMocks();

      const { rerender } = renderHook(
        ({ startConditions, endConditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsOrderView,
            startConditions,
            endConditions,
            debugContext: { asset: 'BTC', leverage: 10 },
          }),
        {
          initialProps: {
            startConditions: [false, false],
            endConditions: [false, false, false],
          },
        },
      );

      // Should not start with partial start conditions
      rerender({
        startConditions: [true, false],
        endConditions: [false, false, false],
      });
      expect(mockTrace).not.toHaveBeenCalled();

      // Start when ALL start conditions are true
      rerender({
        startConditions: [true, true],
        endConditions: [false, false, false],
      });
      expect(mockTrace).toHaveBeenCalledTimes(1);

      // Should not end with partial end conditions
      rerender({
        startConditions: [true, true],
        endConditions: [true, true, false],
      });
      expect(mockEndTrace).not.toHaveBeenCalled();

      // End when ALL end conditions are true
      rerender({
        startConditions: [true, true],
        endConditions: [true, true, true],
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PerpsOrderView,
          data: { success: true },
        }),
      );
      expect(mockDevLogger).toHaveBeenCalledWith(
        expect.stringContaining('completed'),
        expect.objectContaining({
          context: { asset: 'BTC', leverage: 10 },
        }),
      );
    });

    it('should handle rapid condition changes', () => {
      jest.clearAllMocks();

      const { rerender } = renderHook(
        ({ startConditions, endConditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsOrderView,
            startConditions,
            endConditions,
          }),
        {
          initialProps: {
            startConditions: [false],
            endConditions: [false],
          },
        },
      );

      // Rapid start/stop/start should work correctly
      rerender({ startConditions: [true], endConditions: [false] });
      rerender({ startConditions: [false], endConditions: [false] });
      rerender({ startConditions: [true], endConditions: [false] });

      // Should only call trace once (no restart without reset)
      expect(mockTrace).toHaveBeenCalledTimes(1);
    });
  });

  describe('unmount cleanup', () => {
    it('ends an active trace once with an unmounted reason', () => {
      const { unmount } = renderHook(() =>
        usePerpsMeasurement({
          traceName: TraceName.PerpsMarketDetailLive,
          endConditions: [false],
        }),
      );
      const traceId = mockTrace.mock.calls[0][0].id;

      unmount();

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.PerpsMarketDetailLive,
        id: traceId,
        data: { success: false, reason: 'unmounted' },
      });
    });

    it('does not end a completed trace again on unmount', () => {
      const { rerender, unmount } = renderHook(
        ({ endConditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsMarketDetailLive,
            endConditions,
          }),
        { initialProps: { endConditions: [false] } },
      );
      rerender({ endConditions: [true] });
      expect(mockEndTrace).toHaveBeenCalledTimes(1);

      unmount();

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { success: true } }),
      );
    });

    it('does not end a reset trace again on unmount', () => {
      const { rerender, unmount } = renderHook(
        ({ resetConditions }) =>
          usePerpsMeasurement({
            traceName: TraceName.PerpsMarketDetailLive,
            endConditions: [false],
            resetConditions,
          }),
        { initialProps: { resetConditions: [false] } },
      );
      rerender({ resetConditions: [true] });
      expect(mockEndTrace).toHaveBeenCalledTimes(1);

      unmount();

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: { success: false, reason: 'reset' },
        }),
      );
    });
  });

  describe('foreground settle on entry render', () => {
    beforeEach(() => {
      resetPerpsLifecycleContextForTests();
    });

    it.each([
      TraceName.PerpsEntryToLiveMarketList,
      TraceName.PerpsMarketDetailLive,
      TraceName.PerpsTradePageRender,
    ])(
      'settles the foreground when the %s entry span completes',
      (entryTraceName) => {
        expect(getPerpsLifecycleContext()).toBe(
          PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS,
        );

        // Immediate completion (no conditions) — any entry surface, no opt-in.
        renderHook(() => usePerpsMeasurement({ traceName: entryTraceName }));

        // Later in-session flows now read as warm, regardless of entry path.
        expect(getPerpsLifecycleContext()).toBe(PERPS_LIFECYCLE_CONTEXT.WARM);
      },
    );

    it('does not settle the foreground for non-entry spans', () => {
      renderHook(() =>
        usePerpsMeasurement({ traceName: TraceName.PerpsOrderView }),
      );

      expect(getPerpsLifecycleContext()).toBe(
        PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS,
      );
    });
  });
});
