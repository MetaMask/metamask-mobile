import { renderHook } from '@testing-library/react-native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { usePerpsMeasurement } from './usePerpsMeasurement';

// Mock dependencies
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
  },
  TraceOperation: {
    PerpsOperation: 'perps.operation',
    PerpsOrderSubmission: 'perps.order_submission',
  },
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

      // Complete measurement
      rerender({ conditions: [true, true], resetConditions: [false] });

      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { success: true },
        }),
      );

      // Manually trigger reset
      rerender({ conditions: [false, true], resetConditions: [true] });

      // Should end trace with reset reason
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { success: false, reason: 'reset' },
        }),
      );

      // Should be able to start again after reset
      rerender({ conditions: [true, false], resetConditions: [false] });

      // Trace should have been started twice (initial + after reset)
      expect(mockTrace).toHaveBeenCalledTimes(2);
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

    it('should wait for start conditions before beginning measurement', () => {
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
      expect(mockPerformance).not.toHaveBeenCalled();

      // Start when start conditions are met
      mockPerformance.mockReturnValue(2000);
      rerender({
        startConditions: [true],
        endConditions: [false, false],
      });

      expect(mockPerformance).toHaveBeenCalledTimes(1);
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
      expect(mockPerformance).toHaveBeenCalledTimes(1);

      // Reset measurement
      rerender({
        startConditions: [true],
        endConditions: [false],
        resetConditions: [true],
      });

      // Should be able to start again after reset
      mockPerformance.mockReturnValue(3000);
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

      expect(mockPerformance).toHaveBeenCalledTimes(2);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple start and end conditions', () => {
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
      expect(mockPerformance).not.toHaveBeenCalled();

      // Start when ALL start conditions are true
      mockPerformance.mockReturnValue(4000);
      rerender({
        startConditions: [true, true],
        endConditions: [false, false, false],
      });
      expect(mockPerformance).toHaveBeenCalledTimes(1);

      // Should not end with partial end conditions
      rerender({
        startConditions: [true, true],
        endConditions: [true, true, false],
      });
      expect(mockSetMeasurement).not.toHaveBeenCalled();

      // End when ALL end conditions are true
      mockPerformance.mockReturnValue(4750);
      rerender({
        startConditions: [true, true],
        endConditions: [true, true, true],
      });

      expect(mockSetMeasurement).toHaveBeenCalledWith(
        TraceName.PerpsOrderView,
        750,
        'millisecond',
      );
      expect(mockDevLogger).toHaveBeenCalledWith(
        expect.stringContaining('completed'),
        expect.objectContaining({
          context: { asset: 'BTC', leverage: 10 },
        }),
      );
    });

    it('should only complete measurement once', () => {
      const { rerender } = renderHook(
        ({ endConditions }) =>
          usePerpsMeasurement({
            traceName: PerpsMeasurementName.PERPS_ASSET_SCREEN_LOADED,
            endConditions,
          }),
        {
          initialProps: { endConditions: [false] },
        },
      );

      // Complete measurement
      mockPerformance.mockReturnValue(5500);
      rerender({ endConditions: [true] });

      expect(mockSetMeasurement).toHaveBeenCalledTimes(1);

      // Should not complete again even if conditions change
      rerender({ endConditions: [false] });
      rerender({ endConditions: [true] });

      expect(mockSetMeasurement).toHaveBeenCalledTimes(1);
    });
  });

  describe('legacy usePerpsScreenTracking compatibility', () => {
    it('should support the dependencies array pattern', () => {
      const { rerender } = renderHook(
        ({ dependencies }) =>
          usePerpsMeasurement({
            traceName: PerpsMeasurementName.PERPS_ASSET_SCREEN_LOADED,
            dependencies,
          }),
        {
          initialProps: { dependencies: [null, false, 0] },
        },
      );

      // Should start immediately with dependencies pattern
      expect(mockPerformance).toHaveBeenCalledTimes(1);

      // Should not complete until all dependencies are truthy
      expect(mockSetMeasurement).not.toHaveBeenCalled();

      // Complete when all dependencies are truthy
      mockPerformance.mockReturnValue(6000);
      rerender({ dependencies: [true, true, 1] });

      expect(mockSetMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.PERPS_ASSET_SCREEN_LOADED,
        5000,
        'millisecond',
      );
      expect(mockDevLogger).toHaveBeenCalledWith(
        expect.stringContaining('completed'),
        expect.objectContaining({
          dependencies: 3,
        }),
      );
    });
  });

  describe('default immediate measurement', () => {
    it('should perform immediate single measurement when no conditions provided', () => {
      renderHook(() =>
        usePerpsMeasurement({
          traceName: PerpsMeasurementName.PERPS_ASSET_SCREEN_LOADED,
          // No conditions, startConditions, endConditions, resetConditions, or dependencies
        }),
      );

      // Should start and complete immediately
      expect(mockPerformance).toHaveBeenCalledTimes(2); // Start time + duration calculation
      expect(mockSetMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.PERPS_ASSET_SCREEN_LOADED,
        0, // Immediate completion = 0ms
        'millisecond',
      );
      expect(mockDevLogger).toHaveBeenCalledWith(
        expect.stringContaining('completed'),
        expect.objectContaining({
          metric: PerpsMeasurementName.PERPS_ASSET_SCREEN_LOADED,
          duration: '0ms',
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty conditions arrays', () => {
      const { rerender } = renderHook(
        ({ endConditions }) =>
          usePerpsMeasurement({
            traceName: PerpsMeasurementName.PERPS_ASSET_SCREEN_LOADED,
            startConditions: [],
            endConditions,
          }),
        {
          initialProps: { endConditions: [false] },
        },
      );

      // Should start immediately with empty start conditions
      expect(mockPerformance).toHaveBeenCalledTimes(1);

      // Should not complete yet
      expect(mockSetMeasurement).not.toHaveBeenCalled();

      // Complete when end condition becomes true
      mockPerformance.mockReturnValue(8500);
      rerender({ endConditions: [true] });

      expect(mockSetMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.PERPS_ASSET_SCREEN_LOADED,
        7500,
        'millisecond',
      );
    });

    it('should handle rapid condition changes', () => {
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
      mockPerformance.mockReturnValue(8000);
      rerender({ startConditions: [true], endConditions: [false] });
      rerender({ startConditions: [false], endConditions: [false] });
      rerender({ startConditions: [true], endConditions: [false] });

      // Should only call performance.now once (no restart without reset)
      expect(mockPerformance).toHaveBeenCalledTimes(1);
    });
  });
});
