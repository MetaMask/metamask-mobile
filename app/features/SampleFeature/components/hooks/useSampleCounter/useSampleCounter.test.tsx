import { act, renderHook } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useSampleCounter } from './useSampleCounter';

// Mock the Redux hooks
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

// Mock the performance actions
jest.mock('../../../../../core/redux/slices/performance', () => ({
  startPerformanceTrace: jest.fn(),
  endPerformanceTrace: jest.fn(),
}));

import {
  startPerformanceTrace,
  endPerformanceTrace,
} from '../../../../../core/redux/slices/performance';

describe('useSampleCounter', () => {
  const mockDispatch = jest.fn();
  const mockCount = 42;
  const mockStartPerformanceTrace =
    startPerformanceTrace as jest.MockedFunction<typeof startPerformanceTrace>;
  const mockEndPerformanceTrace = endPerformanceTrace as jest.MockedFunction<
    typeof endPerformanceTrace
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockReturnValue(mockCount);

    // Mock dispatch to return the action creators
    mockDispatch.mockImplementation((action) => {
      if (typeof action === 'function') {
        return action(mockDispatch);
      }
      return action;
    });
  });

  it('returns current count from selector', () => {
    const { result } = renderHook(() => useSampleCounter());

    expect(result.current.count).toBe(mockCount);
  });

  it('dispatches increment action when incrementCount is called', () => {
    const { result } = renderHook(() => useSampleCounter());

    act(() => {
      result.current.incrementCount();
    });

    expect(mockDispatch).toHaveBeenCalledTimes(3); // startPerformanceTrace, increment, endPerformanceTrace
    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Object));
  });

  it('dispatches startPerformanceTrace with correct parameters', () => {
    const { result } = renderHook(() => useSampleCounter());

    act(() => {
      result.current.incrementCount();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      mockStartPerformanceTrace({
        eventName: 'SAMPLE_COUNTER_INCREMENT',
        metadata: {
          feature: 'sample-counter',
          operation: 'increment',
          currentCount: mockCount,
          timestamp: expect.any(Number),
        },
      }),
    );
  });

  it('dispatches endPerformanceTrace with success metadata', () => {
    const { result } = renderHook(() => useSampleCounter());

    act(() => {
      result.current.incrementCount();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      mockEndPerformanceTrace({
        eventName: 'SAMPLE_COUNTER_INCREMENT',
        additionalMetadata: {
          success: true,
          newCount: mockCount + 1,
        },
      }),
    );
  });

  it('dispatches endPerformanceTrace with error metadata when increment fails', () => {
    const error = new Error('Increment failed');
    let callCount = 0;
    mockDispatch.mockImplementation((action) => {
      callCount++;
      if (callCount === 1) {
        // First call is startPerformanceTrace
        return action;
      }
      if (callCount === 2) {
        // Second call is increment - throw error
        throw error;
      }
      return action;
    });

    const { result } = renderHook(() => useSampleCounter());

    act(() => {
      expect(() => result.current.incrementCount()).toThrow('Increment failed');
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      mockEndPerformanceTrace({
        eventName: 'SAMPLE_COUNTER_INCREMENT',
        additionalMetadata: {
          success: false,
          error: 'Increment failed',
        },
      }),
    );
  });

  it('maintains stable incrementCount reference', () => {
    const { result, rerender } = renderHook(() => useSampleCounter());
    const firstIncrementCount = result.current.incrementCount;

    rerender();

    expect(result.current.incrementCount).toBe(firstIncrementCount);
  });
});
