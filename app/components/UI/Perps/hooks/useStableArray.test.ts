import { renderHook } from '@testing-library/react-hooks';
import { useStableArray } from './useStableArray';

describe('useStableArray', () => {
  it('should return the same array reference if content is unchanged', () => {
    const initialArray = [1, 2, 3];
    const { result, rerender } = renderHook(
      ({ array }) => useStableArray(array),
      {
        initialProps: { array: initialArray },
      },
    );

    const firstResult = result.current;

    // Rerender with same array content
    rerender({ array: [1, 2, 3] });

    // Should be the same reference
    expect(result.current).toBe(firstResult);
  });

  it('should return new array reference if content changes', () => {
    const { result, rerender } = renderHook(
      ({ array }) => useStableArray(array),
      {
        initialProps: { array: [1, 2, 3] },
      },
    );

    const firstResult = result.current;

    // Rerender with different array
    rerender({ array: [1, 2, 4] });

    // Should be different reference
    expect(result.current).not.toBe(firstResult);
    expect(result.current).toEqual([1, 2, 4]);
  });

  it('should return new array reference if length changes', () => {
    const { result, rerender } = renderHook(
      ({ array }) => useStableArray(array),
      {
        initialProps: { array: [1, 2, 3] },
      },
    );

    const firstResult = result.current;

    // Rerender with different length
    rerender({ array: [1, 2] });

    // Should be different reference
    expect(result.current).not.toBe(firstResult);
    expect(result.current).toEqual([1, 2]);
  });

  it('should handle empty arrays', () => {
    const { result } = renderHook(() => useStableArray([]));
    expect(result.current).toEqual([]);
  });
});
