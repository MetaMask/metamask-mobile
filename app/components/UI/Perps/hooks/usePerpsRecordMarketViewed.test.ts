import { renderHook } from '@testing-library/react-hooks';
import { usePerpsRecordMarketViewed } from './usePerpsRecordMarketViewed';
import { usePerpsMarkets, type UsePerpsMarketsResult } from './usePerpsMarkets';

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

const createMarketsResult = (
  overrides: Partial<UsePerpsMarketsResult> = {},
): UsePerpsMarketsResult => ({
  markets: [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      maxLeverage: '50x',
      price: '$1',
      change24h: '$0',
      change24hPercent: '0%',
      volume: '$1M',
      openInterest: '$1M',
      volumeNumber: 1,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      maxLeverage: '50x',
      price: '$1',
      change24h: '$0',
      change24hPercent: '0%',
      volume: '$1M',
      openInterest: '$1M',
      volumeNumber: 1,
    },
  ],
  isLoading: false,
  isRefreshing: false,
  error: null,
  hasResolvedInitialData: true,
  refresh: jest.fn(),
  ...overrides,
});

describe('usePerpsRecordMarketViewed', () => {
  beforeEach(() => {
    useFocusEffect.mockClear();
    mockRecordMarketViewed.mockClear();
    mockUsePerpsMarkets.mockReturnValue(createMarketsResult());
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

  it('records a symbol while the market list is still loading', () => {
    mockUsePerpsMarkets.mockReturnValue(
      createMarketsResult({
        markets: [],
        isLoading: true,
        hasResolvedInitialData: false,
      }),
    );

    renderHook(() => usePerpsRecordMarketViewed('ETH'));

    const focusCallback = useFocusEffect.mock.calls[0][0] as () => void;
    focusCallback();

    expect(mockRecordMarketViewed).toHaveBeenCalledWith('ETH');
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
