import { renderHook } from '@testing-library/react-native';
import { usePerpMarketNavigationTarget } from './usePerpMarketNavigationTarget';

const mockUseTradablePerpsMarketSymbols = jest.fn();
jest.mock('../../../../UI/WhatsHappening/hooks', () => ({
  useTradablePerpsMarketSymbols: () => mockUseTradablePerpsMarketSymbols(),
}));

describe('usePerpMarketNavigationTarget', () => {
  const setTradableSymbols = (symbols: string[]) => {
    mockUseTradablePerpsMarketSymbols.mockReturnValue({
      tradableSymbols: new Set(symbols),
      isLoading: false,
    });
  };

  it('links a non-HIP-3 symbol directly without a market check', () => {
    setTradableSymbols([]);

    const { result } = renderHook(() => usePerpMarketNavigationTarget('BTC'));

    expect(result.current).toEqual({ targetSymbol: 'BTC', isSupported: true });
  });

  it('links an xyz symbol directly (supported, no membership check)', () => {
    setTradableSymbols([]);

    const { result } = renderHook(() =>
      usePerpMarketNavigationTarget('xyz:SPCX'),
    );

    expect(result.current).toEqual({
      targetSymbol: 'xyz:SPCX',
      isSupported: true,
    });
  });

  it('remaps another HIP-3 provider to its xyz equivalent when that market exists', () => {
    setTradableSymbols(['xyz:SPCX']);

    const { result } = renderHook(() =>
      usePerpMarketNavigationTarget('cash:SPCX'),
    );

    expect(result.current).toEqual({
      targetSymbol: 'xyz:SPCX',
      isSupported: true,
    });
  });

  it('is unsupported when the remapped market is absent from a populated set', () => {
    setTradableSymbols(['BTC', 'ETH', 'xyz:OTHER']);

    const { result } = renderHook(() =>
      usePerpMarketNavigationTarget('cash:SPCX'),
    );

    expect(result.current).toEqual({
      targetSymbol: 'xyz:SPCX',
      isSupported: false,
    });
  });

  it('stays supported (optimistic) when the market set is empty (loading guard)', () => {
    setTradableSymbols([]);

    const { result } = renderHook(() =>
      usePerpMarketNavigationTarget('cash:SPCX'),
    );

    expect(result.current).toEqual({
      targetSymbol: 'xyz:SPCX',
      isSupported: true,
    });
  });
});
