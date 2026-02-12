import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  useIsPerpsBalanceSelected,
  usePerpsPayWithToken,
} from './useIsPerpsBalanceSelected';

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

describe('usePerpsPayWithToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when selector returns null', () => {
    mockUseSelector.mockReturnValue(null);

    const { result } = renderHook(() => usePerpsPayWithToken());

    expect(result.current).toBeNull();
  });

  it('returns null when selector returns non-object', () => {
    mockUseSelector.mockReturnValue('string');

    const { result } = renderHook(() => usePerpsPayWithToken());

    expect(result.current).toBeNull();
  });

  it('returns null when address is not a string', () => {
    mockUseSelector.mockReturnValue({
      address: 123,
      chainId: '0x1',
    });

    const { result } = renderHook(() => usePerpsPayWithToken());

    expect(result.current).toBeNull();
  });

  it('returns null when chainId is not a string', () => {
    mockUseSelector.mockReturnValue({
      address: '0xabc',
      chainId: null,
    });

    const { result } = renderHook(() => usePerpsPayWithToken());

    expect(result.current).toBeNull();
  });

  it('returns object with address and chainId when valid', () => {
    mockUseSelector.mockReturnValue({
      address: '0xusdc',
      chainId: '0xa4b1',
    });

    const { result } = renderHook(() => usePerpsPayWithToken());

    expect(result.current).toEqual({
      description: undefined,
      address: '0xusdc',
      chainId: '0xa4b1',
    });
  });

  it('includes description when it is a string', () => {
    mockUseSelector.mockReturnValue({
      description: 'USDC',
      address: '0xusdc',
      chainId: '0xa4b1',
    });

    const { result } = renderHook(() => usePerpsPayWithToken());

    expect(result.current).toEqual({
      description: 'USDC',
      address: '0xusdc',
      chainId: '0xa4b1',
    });
  });
});
