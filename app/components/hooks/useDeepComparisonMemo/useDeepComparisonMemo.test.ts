import { renderHook } from '@testing-library/react-hooks';
import useDeepComparisonMemo from './useDeepComparisonMemo';

describe('useDeepComparisonMemo', () => {
  it('should return factory result', async () => {
    const mockFactory = jest
      .fn()
      .mockReturnValueOnce('mockValue')
      .mockReturnValueOnce('mockValue2');

    let mockDependencies = ['initial dependency'];

    const { result, rerender } = renderHook(
      () => useDeepComparisonMemo(mockFactory, mockDependencies),
      {},
    );

    expect(mockFactory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('mockValue');

    // rerender with same dependencies returns current value without calling factory
    rerender({});
    expect(mockFactory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('mockValue');

    // update dependencies
    mockDependencies = ['updated dependency'];

    // rerender with updated dependencies calls factory with new value
    rerender({});
    expect(mockFactory).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('mockValue2');
  });
});
