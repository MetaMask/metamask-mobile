import { computeUnrealizedPnl } from './unrealizedPnl';
import type { TraderPosition } from './types';

const verifiedSpot = (): TraderPosition => ({
  positionId: 'pos-verified',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chain: 'ethereum',
  isOpen: true,
  positionAmount: 90.0037,
  costBasis: 87999.999999,
  currentValueUSD: 374380.3695,
  realizedPnl: 123092.8501,
  pnlValueUsd: 409473.2196,
  pnlPercent: null,
  boughtUsd: 200000,
  soldUsd: 0,
  perpPositionType: null,
  perpLeverage: null,
  positionAmountWithLeverage: null,
  costBasisWithLeverage: null,
  marginUsd: null,
  trades: [],
  lastTradeAt: 1_700_000_000,
});

describe('computeUnrealizedPnl', () => {
  it('subtracts cost basis from current value for an open spot position', () => {
    const position = verifiedSpot();

    const result = computeUnrealizedPnl(position);

    expect(result.usd).toBeCloseTo(286380.369501, 4);
    expect(result.percent).toBeCloseTo((286380.369501 / 87999.999999) * 100, 4);
  });

  it('reconciles realized plus unrealized with pnlValueUsd', () => {
    const position = verifiedSpot();

    const unrealized = computeUnrealizedPnl(position);
    const total = position.realizedPnl + (unrealized.usd ?? 0);

    expect(total).toBeCloseTo(position.pnlValueUsd ?? 0, 4);
  });

  it('returns a null percent when cost basis is zero', () => {
    const position = verifiedSpot();
    position.costBasis = 0;
    position.currentValueUSD = 10;

    const result = computeUnrealizedPnl(position);

    expect(result.usd).toBe(10);
    expect(result.percent).toBeNull();
  });

  it('returns zero unrealized USD for a closed position', () => {
    const position = verifiedSpot();
    position.isOpen = false;

    const result = computeUnrealizedPnl(position);

    expect(result).toEqual({ usd: 0, percent: null });
  });

  it('returns null for a perp position', () => {
    const position = verifiedSpot();
    position.perpPositionType = 'short';
    position.perpLeverage = 5;

    const result = computeUnrealizedPnl(position);

    expect(result).toEqual({ usd: null, percent: null });
  });
});
