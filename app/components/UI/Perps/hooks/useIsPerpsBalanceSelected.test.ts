import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useIsPerpsBalanceSelected } from './useIsPerpsBalanceSelected';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useIsPerpsBalanceSelected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when selector returns true', () => {
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useIsPerpsBalanceSelected());

    expect(result.current).toBe(true);
    expect(mockUseSelector).toHaveBeenCalledTimes(1);
  });

  it('returns false when selector returns false', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() => useIsPerpsBalanceSelected());

    expect(result.current).toBe(false);
    expect(mockUseSelector).toHaveBeenCalledTimes(1);
  });
});
