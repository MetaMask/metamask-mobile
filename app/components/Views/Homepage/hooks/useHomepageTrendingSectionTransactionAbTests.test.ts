import { renderHook, act } from '@testing-library/react-native';
import { useHomepageTrendingSectionTransactionAbTests } from './useHomepageTrendingSectionTransactionAbTests';
import { HOMEPAGE_TRENDING_SECTIONS_AB_KEY } from '../abTestConfig';
import { setTransactionActiveAbTests } from '../../../../core/redux/slices/bridge';

const mockDispatch = jest.fn();
let mockSelectorReturn: unknown;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: () => mockSelectorReturn,
}));

const mockTrendingAbTest = jest.fn(() => ({
  variantName: 'control',
  isActive: false,
}));

jest.mock('../context/HomepageTrendingAbTestContext', () => ({
  useHomepageTrendingAbTest: () => mockTrendingAbTest(),
}));

describe('useHomepageTrendingSectionTransactionAbTests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectorReturn = undefined;
    mockTrendingAbTest.mockReturnValue({
      variantName: 'control',
      isActive: false,
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
    mockTrendingAbTest.mockReturnValue({
      variantName: 'trendingSections',
      isActive: true,
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

  it('clearTransactionAbTests dispatches undefined when tests are set', () => {
    mockSelectorReturn = [
      { key: HOMEPAGE_TRENDING_SECTIONS_AB_KEY, value: 'trendingSections' },
    ];
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

  it('clearTransactionAbTests skips dispatch when already undefined', () => {
    mockSelectorReturn = undefined;
    const { result } = renderHook(() =>
      useHomepageTrendingSectionTransactionAbTests(),
    );

    act(() => {
      result.current.clearTransactionAbTests();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
