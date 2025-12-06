import { renderHook, act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePerpsOrderBookGrouping } from './usePerpsOrderBookGrouping';
import { usePerpsSelector } from './usePerpsSelector';

// Mock dependencies
jest.mock('./usePerpsSelector');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      saveOrderBookGrouping: jest.fn(),
    },
  },
}));

const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
>;

describe('usePerpsOrderBookGrouping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns savedGrouping from selector', () => {
    mockUsePerpsSelector.mockReturnValue(10);

    const { result } = renderHook(() => usePerpsOrderBookGrouping('BTC'));

    expect(result.current.savedGrouping).toBe(10);
    expect(mockUsePerpsSelector).toHaveBeenCalled();
  });

  it('returns undefined when no saved grouping exists', () => {
    mockUsePerpsSelector.mockReturnValue(undefined);

    const { result } = renderHook(() => usePerpsOrderBookGrouping('ETH'));

    expect(result.current.savedGrouping).toBeUndefined();
  });

  it('saves grouping via PerpsController', () => {
    mockUsePerpsSelector.mockReturnValue(undefined);

    const { result } = renderHook(() => usePerpsOrderBookGrouping('BTC'));

    act(() => {
      result.current.saveGrouping(50);
    });

    expect(
      Engine.context.PerpsController?.saveOrderBookGrouping,
    ).toHaveBeenCalledWith('BTC', 50);
  });

  it('memoizes saveGrouping callback by symbol', () => {
    mockUsePerpsSelector.mockReturnValue(undefined);

    const { result, rerender } = renderHook(
      ({ symbol }) => usePerpsOrderBookGrouping(symbol),
      { initialProps: { symbol: 'BTC' } },
    );

    const firstCallback = result.current.saveGrouping;
    rerender({ symbol: 'BTC' });
    const secondCallback = result.current.saveGrouping;

    expect(firstCallback).toBe(secondCallback);
  });
});
