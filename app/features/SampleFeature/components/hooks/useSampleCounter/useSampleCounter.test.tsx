import { act, renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { useSampleCounter } from './useSampleCounter';
import React from 'react';

// Mock the Redux hooks
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

describe('useSampleCounter', () => {
  const mockDispatch = jest.fn();
  const mockCount = 42;

  beforeEach(() => {
    jest.clearAllMocks();
    require('react-redux').useDispatch.mockReturnValue(mockDispatch);
    require('react-redux').useSelector.mockReturnValue(mockCount);
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

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Object));
  });

  it('maintains stable incrementCount reference', () => {
    const { result, rerender } = renderHook(() => useSampleCounter());
    const firstIncrementCount = result.current.incrementCount;

    rerender();

    expect(result.current.incrementCount).toBe(firstIncrementCount);
  });
}); 