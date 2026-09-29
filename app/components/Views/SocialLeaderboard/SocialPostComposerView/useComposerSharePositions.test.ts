import { renderHook } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import { useTraderPositions } from '../TraderProfileView/hooks/useTraderPositions';
import { useComposerSharePositions } from './useComposerSharePositions';

jest.mock('../TraderProfileView/hooks/useTraderPositions', () => ({
  useTraderPositions: jest.fn(),
}));

const mockUseTraderPositions = jest.mocked(useTraderPositions);

const socialPerp: Position = {
  positionId: 'clicker-btc',
  tokenSymbol: 'BTC',
  tokenName: 'Bitcoin',
  tokenAddress: '',
  chain: 'hyperliquid',
  positionAmount: 0.5,
  boughtUsd: 30000,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 30000,
  trades: [],
  lastTradeAt: Date.now(),
  currentValueUSD: 32000,
  pnlPercent: 6,
  perpPositionType: 'long',
  perpLeverage: 5,
};

const traderPositionsResult = {
  openPositions: [socialPerp],
  closedPositions: [] as Position[],
  isLoadingOpen: false,
  isLoadingClosed: false,
  error: null,
  refetch: jest.fn().mockResolvedValue(undefined),
};

describe('useComposerSharePositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTraderPositions.mockReturnValue(traderPositionsResult);
  });

  it('returns Clicker positions from useTraderPositions', () => {
    const { result } = renderHook(() => useComposerSharePositions('0xabc'));

    expect(mockUseTraderPositions).toHaveBeenCalledWith('0xabc');
    expect(result.current.openPositions).toStrictEqual([socialPerp]);
  });
});
