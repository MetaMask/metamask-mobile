import { renderHook } from '@testing-library/react-native';
import { formatFiat } from './fiat';
import type { TraderPosition } from './types';
import { useTraderPosition } from './useTraderPosition';
import { useUnrealizedPnl } from './useUnrealizedPnl';
import { useUsdToFiatRate } from './useUsdToFiatRate';

jest.mock('./useTraderPosition', () => ({
  useTraderPosition: jest.fn(),
}));

jest.mock('./useUsdToFiatRate', () => ({
  useUsdToFiatRate: jest.fn(),
}));

const mockUseTraderPosition = useTraderPosition as jest.MockedFunction<
  typeof useTraderPosition
>;
const mockUseUsdToFiatRate = useUsdToFiatRate as jest.MockedFunction<
  typeof useUsdToFiatRate
>;

const position = {
  positionId: 'pos-1',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chain: 'ethereum',
  isOpen: true,
  positionAmount: 1,
  costBasis: 100,
  currentValueUSD: 150,
  realizedPnl: 0,
  pnlValueUsd: 50,
  pnlPercent: null,
  boughtUsd: 100,
  soldUsd: 0,
  perpPositionType: null,
  perpLeverage: null,
  positionAmountWithLeverage: null,
  costBasisWithLeverage: null,
  marginUsd: null,
  trades: [],
  lastTradeAt: 0,
} satisfies TraderPosition;

describe('useUnrealizedPnl', () => {
  beforeEach(() => {
    mockUseUsdToFiatRate.mockReturnValue({ currency: 'usd', rate: 1 });
    mockUseTraderPosition.mockReturnValue({
      position,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('formats unrealized PnL in USD without converting the percent', () => {
    const { result } = renderHook(() => useUnrealizedPnl('pos-1'));

    expect(result.current.hasPosition).toBe(true);
    expect(result.current.isProfit).toBe(true);
    expect(result.current.currency).toBe('USD');
    expect(result.current.valueFormatted).toBe('+$50.00');
    expect(result.current.percentFormatted).toContain('50');
    expect(result.current.fellBackToUsd).toBe(false);
  });

  it('reports no position when the endpoint has none', () => {
    mockUseTraderPosition.mockReturnValue({
      position: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUnrealizedPnl(undefined));

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.valueFormatted).toBeNull();
    expect(result.current.percentFormatted).toBeNull();
  });

  it('passes loading and error through when there is no position', () => {
    mockUseTraderPosition.mockReturnValue({
      position: null,
      isLoading: true,
      error: 'network down',
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUnrealizedPnl('pos-1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('network down');
    expect(result.current.hasPosition).toBe(false);
  });

  it('hides the value when unrealized USD is unavailable', () => {
    mockUseTraderPosition.mockReturnValue({
      position: { ...position, perpPositionType: 'long' },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUnrealizedPnl('pos-1'));

    expect(result.current.hasPosition).toBe(true);
    expect(result.current.valueFormatted).toBeNull();
    expect(result.current.percentFormatted).toBeNull();
    expect(result.current.isProfit).toBe(false);
  });

  it('formats a loss without converting the percent', () => {
    mockUseTraderPosition.mockReturnValue({
      position: { ...position, currentValueUSD: 40 },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUnrealizedPnl('pos-1'));

    expect(result.current.isProfit).toBe(false);
    expect(result.current.valueFormatted).toBe(formatFiat(-60, 'USD'));
    expect(result.current.percentFormatted).toContain('60');
  });

  it('omits the percent when cost basis is zero', () => {
    mockUseTraderPosition.mockReturnValue({
      position: { ...position, costBasis: 0, currentValueUSD: 10 },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUnrealizedPnl('pos-1'));

    expect(result.current.percentFormatted).toBeNull();
    expect(result.current.valueFormatted).toBe(formatFiat(10, 'USD'));
  });

  it('converts unrealized USD into the selected currency', () => {
    mockUseUsdToFiatRate.mockReturnValue({ currency: 'EUR', rate: 2 });

    const { result } = renderHook(() => useUnrealizedPnl('pos-1'));

    expect(result.current.currency).toBe('EUR');
    expect(result.current.valueFormatted).toBe(formatFiat(100, 'EUR'));
    expect(result.current.fellBackToUsd).toBe(false);
  });

  it('keeps USD when the selected currency has no rate', () => {
    mockUseUsdToFiatRate.mockReturnValue({ currency: 'EUR', rate: undefined });

    const { result } = renderHook(() => useUnrealizedPnl('pos-1'));

    expect(result.current.fellBackToUsd).toBe(true);
    expect(result.current.currency).toBe('USD');
    expect(result.current.valueFormatted).toBe(formatFiat(50, 'USD'));
  });
});
