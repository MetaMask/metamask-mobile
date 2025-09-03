import { renderHook, act } from '@testing-library/react-native';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import { usePerpsPerformance } from './usePerpsPerformance';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

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

describe('usePerpsPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startMeasure and endMeasure', () => {
    it('should measure duration between start and end', () => {
      const { result } = renderHook(() => usePerpsPerformance());

      // Mock performance.now to return specific values
      (performance.now as jest.Mock)
        .mockReturnValueOnce(1000) // startMeasure call
        .mockReturnValueOnce(1100); // endMeasure call

      act(() => {
        result.current.startMeasure(PerpsMeasurementName.MARKETS_SCREEN_LOADED);
      });

      let duration = 0;
      act(() => {
        duration = result.current.endMeasure(
          PerpsMeasurementName.MARKETS_SCREEN_LOADED,
        );
      });

      expect(duration).toBe(100); // 100ms difference (1100 - 1000)

      expect(setMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.MARKETS_SCREEN_LOADED,
        100,
        'millisecond',
      );
    });

    it('should handle multiple concurrent measurements', () => {
      const { result } = renderHook(() => usePerpsPerformance());

      // Mock specific values for each call
      (performance.now as jest.Mock)
        .mockReturnValueOnce(1000) // First startMeasure
        .mockReturnValueOnce(1100) // Second startMeasure
        .mockReturnValueOnce(1200) // First endMeasure (for MARKETS)
        .mockReturnValueOnce(1300); // Second endMeasure (for TRADE)

      act(() => {
        result.current.startMeasure(PerpsMeasurementName.MARKETS_SCREEN_LOADED);
        result.current.startMeasure(PerpsMeasurementName.TRADE_SCREEN_LOADED);
      });

      let duration1 = 0;
      let duration2 = 0;
      act(() => {
        duration1 = result.current.endMeasure(
          PerpsMeasurementName.MARKETS_SCREEN_LOADED,
        );
        duration2 = result.current.endMeasure(
          PerpsMeasurementName.TRADE_SCREEN_LOADED,
        );
      });

      expect(duration1).toBe(200); // Started at 1000, ended at 1200
      expect(duration2).toBe(200); // Started at 1100, ended at 1300

      expect(setMeasurement).toHaveBeenCalledTimes(2);
    });

    it('should log and return 0 when ending measurement without start', () => {
      const { result } = renderHook(() => usePerpsPerformance());

      let duration = 0;
      act(() => {
        duration = result.current.endMeasure(
          PerpsMeasurementName.MARKETS_SCREEN_LOADED,
        );
      });

      expect(duration).toBe(0);

      expect(DevLogger.log).toHaveBeenCalledWith(
        `No start time found for metric: ${PerpsMeasurementName.MARKETS_SCREEN_LOADED}`,
      );
      expect(setMeasurement).not.toHaveBeenCalled();
    });
  });

  describe('measure', () => {
    it('should measure synchronous operation', () => {
      const { result } = renderHook(() => usePerpsPerformance());
      const mockOperation = jest.fn().mockReturnValue('test-result');

      // Set up incremental mock
      let callCount = 0;
      (performance.now as jest.Mock).mockImplementation(
        () => callCount++ * 100,
      );

      let operationResult: string | undefined;
      act(() => {
        operationResult = result.current.measure(
          PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED,
          mockOperation,
        );
      });

      expect(operationResult).toBe('test-result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(setMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED,
        100, // Second call (100) - first call (0)
        'millisecond',
      );
    });

    it('should handle operation that throws error', () => {
      const { result } = renderHook(() => usePerpsPerformance());
      const mockOperation = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      // Mock will be called once before the error
      (performance.now as jest.Mock).mockReturnValue(0);

      expect(() => {
        act(() => {
          result.current.measure(
            PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED,
            mockOperation,
          );
        });
      }).toThrow('Test error');

      expect(mockOperation).toHaveBeenCalledTimes(1);
      // Synchronous measure doesn't record on error (it throws immediately)
      expect(setMeasurement).not.toHaveBeenCalled();
    });
  });

  describe('measureAsync', () => {
    it('should measure async operation', async () => {
      const { result } = renderHook(() => usePerpsPerformance());
      const mockOperation = jest.fn().mockResolvedValue('async-result');

      // Set up incremental mock
      let callCount = 0;
      (performance.now as jest.Mock).mockImplementation(() =>
        callCount++ === 0 ? 0 : 150,
      );

      let operationResult: string | undefined;
      await act(async () => {
        operationResult = await result.current.measureAsync(
          PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED,
          mockOperation,
        );
      });

      expect(operationResult).toBe('async-result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(setMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED,
        150,
        'millisecond',
      );
    });

    it('should measure async operation that throws', async () => {
      const { result } = renderHook(() => usePerpsPerformance());
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Async error'));

      // Set up incremental mock
      let callCount = 0;
      (performance.now as jest.Mock).mockImplementation(() =>
        callCount++ === 0 ? 0 : 75,
      );

      await expect(
        act(async () => {
          await result.current.measureAsync(
            PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED,
            mockOperation,
          );
        }),
      ).rejects.toThrow('Async error');

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(setMeasurement).toHaveBeenCalledWith(
        PerpsMeasurementName.ORDER_SUBMISSION_TOAST_LOADED,
        75,
        'millisecond',
      );
    });
  });
});
