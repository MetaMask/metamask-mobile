import { renderHook } from '@testing-library/react-native';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import { usePerpsScreenTracking } from './usePerpsScreenTracking';
import { PerpsMeasurementName } from '../constants/performanceMetrics';

// Mock dependencies
jest.mock('react-native-performance', () => ({
  now: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
}));

describe('usePerpsScreenTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track screen load time when dependencies are met', () => {
    const dependencies = [true, 'data-loaded'];

    // Mock time progression
    let currentTime = 0;
    (performance.now as jest.Mock).mockImplementation(() => {
      const time = currentTime;
      currentTime += 100;
      return time;
    });

    renderHook(() =>
      usePerpsScreenTracking({
        screenName: PerpsMeasurementName.MARKETS_SCREEN_LOADED,
        dependencies,
      }),
    );

    expect(setMeasurement).toHaveBeenCalledWith(
      PerpsMeasurementName.MARKETS_SCREEN_LOADED,
      100, // 100ms from start (0) to first effect (100)
      'millisecond',
    );
  });

  it('should not track when dependencies are not met', () => {
    const dependencies = [false, null];

    renderHook(() =>
      usePerpsScreenTracking({
        screenName: PerpsMeasurementName.MARKETS_SCREEN_LOADED,
        dependencies,
      }),
    );

    expect(setMeasurement).not.toHaveBeenCalled();
  });

  it('should only track once even with re-renders', () => {
    const dependencies = [true, 'data'];

    // Setup consistent time values
    let callCount = 0;
    (performance.now as jest.Mock).mockImplementation(() => callCount++ * 100);

    const { rerender } = renderHook(
      ({ deps }) =>
        usePerpsScreenTracking({
          screenName: PerpsMeasurementName.MARKETS_SCREEN_LOADED,
          dependencies: deps,
        }),
      {
        initialProps: { deps: dependencies },
      },
    );

    // First render - should track
    expect(setMeasurement).toHaveBeenCalledTimes(1);

    // Re-render with same dependencies - should not track again
    rerender({ deps: dependencies });
    expect(setMeasurement).toHaveBeenCalledTimes(1);

    // Re-render with different dependencies - should still not track again
    rerender({ deps: [true, 'new-data'] });
    expect(setMeasurement).toHaveBeenCalledTimes(1);
  });

  it('should work with empty dependencies array', () => {
    // Setup time mock
    let currentTime = 0;
    (performance.now as jest.Mock).mockImplementation(() => {
      const time = currentTime;
      currentTime += 100;
      return time;
    });

    renderHook(() =>
      usePerpsScreenTracking({
        screenName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
        dependencies: [],
      }),
    );

    // Should track immediately with empty deps
    expect(setMeasurement).toHaveBeenCalledWith(
      PerpsMeasurementName.ASSET_SCREEN_LOADED,
      100,
      'millisecond',
    );
  });

  it('should work without dependencies parameter (default empty array)', () => {
    // Setup time mock
    let currentTime = 0;
    (performance.now as jest.Mock).mockImplementation(() => {
      const time = currentTime;
      currentTime += 100;
      return time;
    });

    renderHook(() =>
      usePerpsScreenTracking({
        screenName: PerpsMeasurementName.WITHDRAWAL_SCREEN_LOADED,
      }),
    );

    // Should track immediately with default empty deps
    expect(setMeasurement).toHaveBeenCalledWith(
      PerpsMeasurementName.WITHDRAWAL_SCREEN_LOADED,
      100,
      'millisecond',
    );
  });

  it('should wait for all dependencies to be truthy', () => {
    // Setup time mock - start at 0 and increment by 100 each call
    let currentTime = 0;
    (performance.now as jest.Mock).mockImplementation(() => {
      const time = currentTime;
      currentTime += 100;
      return time;
    });

    const { rerender } = renderHook(
      ({ deps }) =>
        usePerpsScreenTracking({
          screenName: PerpsMeasurementName.CLOSE_SCREEN_LOADED,
          dependencies: deps,
        }),
      {
        initialProps: { deps: [false, null, undefined] },
      },
    );

    // Should not track initially
    expect(setMeasurement).not.toHaveBeenCalled();

    // Partially true dependencies - still should not track
    rerender({ deps: [true, null, undefined] });
    expect(setMeasurement).not.toHaveBeenCalled();

    // More dependencies true - still should not track
    rerender({ deps: [true, true, undefined] });
    expect(setMeasurement).not.toHaveBeenCalled();

    // All dependencies true - should track
    rerender({ deps: [true, true, true] });
    expect(setMeasurement).toHaveBeenCalled();
  });

  it('should handle different screen names', () => {
    // Reset mocks for new test
    jest.clearAllMocks();

    // Mock specific time values for this test
    (performance.now as jest.Mock)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(250);

    renderHook(() =>
      usePerpsScreenTracking({
        screenName: PerpsMeasurementName.TRANSACTION_HISTORY_SCREEN_LOADED,
        dependencies: [true],
      }),
    );

    expect(setMeasurement).toHaveBeenCalledWith(
      PerpsMeasurementName.TRANSACTION_HISTORY_SCREEN_LOADED,
      250,
      'millisecond',
    );
  });

  it('should measure correct time from component mount', () => {
    jest.clearAllMocks();

    // Setup time values: initial mount at 0, measurement at 500
    (performance.now as jest.Mock)
      .mockReturnValueOnce(0) // Initial mount
      .mockReturnValueOnce(300) // First check (deps false)
      .mockReturnValueOnce(500); // Second check (deps true)

    const { rerender } = renderHook(
      ({ deps }) =>
        usePerpsScreenTracking({
          screenName: PerpsMeasurementName.POSITION_DATA_LOADED_PERP_TAB,
          dependencies: deps,
        }),
      {
        initialProps: { deps: [false] },
      },
    );

    // Dependencies not met - no tracking
    expect(setMeasurement).not.toHaveBeenCalled();

    // Dependencies met - should track from initial mount time
    rerender({ deps: [true] });

    expect(setMeasurement).toHaveBeenCalledWith(
      PerpsMeasurementName.POSITION_DATA_LOADED_PERP_TAB,
      500, // Time from mount (0) to when deps are met (500)
      'millisecond',
    );
  });
});
