import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

import { useIsCardholder } from './useIsCardholder';
import { selectIsCardholder } from '../../../../core/redux/slices/card';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  selectIsCardholder: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useIsCardholder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when user is a cardholder', () => {
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useIsCardholder());

    expect(result.current).toBe(true);
    expect(mockUseSelector).toHaveBeenCalledWith(selectIsCardholder);
    expect(mockUseSelector).toHaveBeenCalledTimes(1);
  });

  it('should return false when user is not a cardholder', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() => useIsCardholder());

    expect(result.current).toBe(false);
    expect(mockUseSelector).toHaveBeenCalledWith(selectIsCardholder);
    expect(mockUseSelector).toHaveBeenCalledTimes(1);
  });

  it('should call useSelector with the correct selector', () => {
    mockUseSelector.mockReturnValue(false);

    renderHook(() => useIsCardholder());

    expect(mockUseSelector).toHaveBeenCalledWith(selectIsCardholder);
  });

  it('should return false when selector returns undefined or falsy values', () => {
    mockUseSelector.mockReturnValue(undefined);
    const { result: undefinedResult } = renderHook(() => useIsCardholder());
    expect(undefinedResult.current).toBe(false);

    mockUseSelector.mockReturnValue(null);
    const { result: nullResult } = renderHook(() => useIsCardholder());
    expect(nullResult.current).toBe(false);

    mockUseSelector.mockReturnValue('');
    const { result: emptyStringResult } = renderHook(() => useIsCardholder());
    expect(emptyStringResult.current).toBe(false);

    mockUseSelector.mockReturnValue(0);
    const { result: zeroResult } = renderHook(() => useIsCardholder());
    expect(zeroResult.current).toBe(false);

    expect(mockUseSelector).toHaveBeenCalledWith(selectIsCardholder);
  });

  it('should re-render when selector value changes', () => {
    mockUseSelector.mockReturnValue(false);

    const { result, rerender } = renderHook(() => useIsCardholder());

    expect(result.current).toBe(false);

    mockUseSelector.mockReturnValue(true);
    rerender();

    expect(result.current).toBe(true);
  });

  it('should maintain referential stability when selector value does not change', () => {
    mockUseSelector.mockReturnValue(true);

    const { result, rerender } = renderHook(() => useIsCardholder());
    const firstResult = result.current;

    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
    expect(firstResult).toBe(true);
  });
});
