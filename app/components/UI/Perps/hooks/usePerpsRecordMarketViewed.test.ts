import { renderHook } from '@testing-library/react-hooks';
import { usePerpsRecordMarketViewed } from './usePerpsRecordMarketViewed';
import { usePerpsMarkets } from './usePerpsMarkets';

const mockRecordMarketViewed = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      recordMarketViewed: (...args: unknown[]) =>
        mockRecordMarketViewed(...args),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('./usePerpsMarkets');

const { useFocusEffect } = jest.requireMock('@react-navigation/native') as {
  useFocusEffect: jest.Mock;
};

const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;

describe('usePerpsRecordMarketViewed', () => {
  beforeEach(() => {
    useFocusEffect.mockClear();
    mockRecordMarketViewed.mockClear();
    mockUsePerpsMarkets.mockReturnValue({
      markets: [{ symbol: 'BTC' }, { symbol: 'ETH' }],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    } as ReturnType<typeof usePerpsMarkets>);
  });

  it('records the market view when the screen is focused', () => {
    renderHook(() => usePerpsRecordMarketViewed('BTC'));

    const focusCallback = useFocusEffect.mock.calls[0][0] as () => void;
    focusCallback();

    expect(mockRecordMarketViewed).toHaveBeenCalledWith('BTC');
  });

  it('does not record a view when symbol is undefined', () => {
    renderHook(() => usePerpsRecordMarketViewed(undefined));

    const focusCallback = useFocusEffect.mock.calls[0][0] as () => void;
    focusCallback();

    expect(mockRecordMarketViewed).not.toHaveBeenCalled();
  });

  it('does not record a delisted or unknown symbol once markets are loaded', () => {
    renderHook(() => usePerpsRecordMarketViewed('DELISTED'));

    const focusCallback = useFocusEffect.mock.calls[0][0] as () => void;
    focusCallback();

    expect(mockRecordMarketViewed).not.toHaveBeenCalled();
  });

  it('records the new symbol when it changes', () => {
    const { rerender } = renderHook(
      ({ symbol }: { symbol?: string }) => usePerpsRecordMarketViewed(symbol),
      { initialProps: { symbol: 'BTC' } },
    );

    const firstCallback = useFocusEffect.mock.calls[0][0] as () => void;
    firstCallback();
    expect(mockRecordMarketViewed).toHaveBeenCalledWith('BTC');

    mockRecordMarketViewed.mockClear();
    rerender({ symbol: 'ETH' });

    const latestCall = useFocusEffect.mock.calls.at(-1);
    const nextCallback = latestCall?.[0] as () => void;
    nextCallback();

    expect(mockRecordMarketViewed).toHaveBeenCalledWith('ETH');
  });
});
