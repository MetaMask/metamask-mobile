import { renderHook } from '@testing-library/react-native';
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
    expect(result.current.currency).toBe('usd');
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
});
