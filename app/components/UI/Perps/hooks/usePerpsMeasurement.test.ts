import { setMeasurement } from '@sentry/react-native';
import { renderHook } from '@testing-library/react-native';
import performance from 'react-native-performance';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import { usePerpsMeasurement } from './usePerpsMeasurement';

// Mock dependencies
jest.mock('react-native-performance', () => ({
  now: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

const mockPerformance = performance.now as jest.MockedFunction<
  typeof performance.now
>;
const mockSetMeasurement = setMeasurement as jest.MockedFunction<
  typeof setMeasurement
>;
const mockDevLogger = DevLogger.log as jest.MockedFunction<
  typeof DevLogger.log
>;

describe('usePerpsMeasurement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.mockReturnValue(1000); // Mock initial time
  });

  describe('simple API with conditions', () => {
    it('should start immediately and end when conditions are met', () => {
      const { rerender } = renderHook(
        ({ conditions }) =>
          usePerpsMeasurement({
            measurementName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
            conditions,
          }),
        {
          initialProps: { conditions: [false, false] },
        },
      );

      // Should start immediately with simple API
      expect(mockPerformance).toHaveBeenCalledTimes(1);

      // Complete when all conditions are true
      mockPerformance.mockReturnValue(1750);
      rerender({ conditions: [true, true] });

      expect(mockSetMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.ASSET_SCREEN_LOADED,
        750,
        'millisecond',
      );
    });

    it('should auto-reset when first condition becomes false', () => {
      jest.clearAllMocks();
      mockPerformance.mockReturnValue(1000);

      const { rerender } = renderHook(
        ({ conditions, resetConditions }) =>
          usePerpsMeasurement({
            measurementName: PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED,
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

      // Should start immediately
      expect(mockPerformance).toHaveBeenCalledTimes(1);

      // Complete measurement
      mockPerformance.mockReturnValue(1500);
      rerender({ conditions: [true, true], resetConditions: [false] });

      expect(mockSetMeasurement).toHaveBeenCalledTimes(1);

      // Manually trigger reset
      rerender({ conditions: [false, true], resetConditions: [true] });

      // Should be able to start again after reset
      mockPerformance.mockReturnValue(2000);
      rerender({ conditions: [true, false], resetConditions: [false] });

      // We should have called performance.now 3 times:
      // 1. Initial start, 2. Duration calculation for completion, 3. Second start after reset
      expect(mockPerformance).toHaveBeenCalledTimes(3);
    });
  });

  describe('advanced API with explicit conditions', () => {
    it('should start measurement immediately when no start conditions provided', () => {
      const { rerender } = renderHook(
        ({ endConditions }) =>
          usePerpsMeasurement({
            measurementName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
            endConditions,
          }),
        {
          initialProps: { endConditions: [false, false] },
        },
      );

      // Should start immediately
      expect(mockPerformance).toHaveBeenCalledTimes(1);

      // Complete measurement when all end conditions are true
      mockPerformance.mockReturnValue(1500); // 500ms later
      rerender({ endConditions: [true, true] });

      expect(mockSetMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.ASSET_SCREEN_LOADED,
        500,
        'millisecond',
      );
      expect(mockDevLogger).toHaveBeenCalledWith(
        expect.stringContaining('completed'),
        expect.objectContaining({
          metric: PerpsMeasurementName.ASSET_SCREEN_LOADED,
          duration: '500ms',
        }),
      );
    });

    it('should wait for start conditions before beginning measurement', () => {
      const { rerender } = renderHook(
        ({ startConditions, endConditions }) =>
          usePerpsMeasurement({
            measurementName: PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED,
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
            measurementName: PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED,
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
            measurementName: PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED,
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
        PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED,
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
            measurementName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
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
            measurementName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
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
        PerpsMeasurementName.ASSET_SCREEN_LOADED,
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
          measurementName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
          // No conditions, startConditions, endConditions, resetConditions, or dependencies
        }),
      );

      // Should start and complete immediately
      expect(mockPerformance).toHaveBeenCalledTimes(2); // Start time + duration calculation
      expect(mockSetMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.ASSET_SCREEN_LOADED,
        0, // Immediate completion = 0ms
        'millisecond',
      );
      expect(mockDevLogger).toHaveBeenCalledWith(
        expect.stringContaining('completed'),
        expect.objectContaining({
          metric: PerpsMeasurementName.ASSET_SCREEN_LOADED,
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
            measurementName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
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
        PerpsMeasurementName.ASSET_SCREEN_LOADED,
        7500,
        'millisecond',
      );
    });

    it('should handle rapid condition changes', () => {
      const { rerender } = renderHook(
        ({ startConditions, endConditions }) =>
          usePerpsMeasurement({
            measurementName: PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED,
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
