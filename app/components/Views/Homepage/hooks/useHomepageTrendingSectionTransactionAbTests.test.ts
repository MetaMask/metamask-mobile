import { renderHook, act } from '@testing-library/react-native';
import { useHomepageTrendingSectionTransactionAbTests } from './useHomepageTrendingSectionTransactionAbTests';
import { HOMEPAGE_TRENDING_SECTIONS_AB_KEY } from '../abTestConfig';
import { setTransactionActiveAbTests } from '../../../../core/redux/slices/bridge';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockUseABTest = jest.fn(() => ({
  variantName: 'control',
  isActive: false,
  variant: {},
}));

jest.mock('../../../../hooks', () => ({
  useABTest: () => mockUseABTest(),
}));

describe('useHomepageTrendingSectionTransactionAbTests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseABTest.mockReturnValue({
      variantName: 'control',
      isActive: false,
      variant: {},
    });
  });

  it('dispatches undefined when applyTag is called and AB is inactive', () => {
    const { result } = renderHook(() =>
      useHomepageTrendingSectionTransactionAbTests(),
    );

    act(() => {
      result.current.applyTagForDedicatedTrendingSection();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setTransactionActiveAbTests(undefined),
    );
  });

  it('dispatches homepage trending key when applyTag is called and AB is active', () => {
    mockUseABTest.mockReturnValue({
      variantName: 'trendingSections',
      isActive: true,
      variant: { separateTrending: true },
    });

    const { result } = renderHook(() =>
      useHomepageTrendingSectionTransactionAbTests(),
    );

    act(() => {
      result.current.applyTagForDedicatedTrendingSection();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setTransactionActiveAbTests([
        { key: HOMEPAGE_TRENDING_SECTIONS_AB_KEY, value: 'trendingSections' },
      ]),
    );
  });

  it('clearTransactionAbTests dispatches undefined', () => {
    const { result } = renderHook(() =>
      useHomepageTrendingSectionTransactionAbTests(),
    );

    act(() => {
      result.current.clearTransactionAbTests();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setTransactionActiveAbTests(undefined),
    );
  });
});
