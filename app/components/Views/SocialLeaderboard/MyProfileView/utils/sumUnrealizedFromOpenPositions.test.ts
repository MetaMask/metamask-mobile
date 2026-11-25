import type { Position } from '@metamask/social-controllers';
import { sumUnrealizedFromOpenPositions } from './sumUnrealizedFromOpenPositions';

const position = (
  positionId: string,
  overrides: Partial<Position> = {},
): Position => ({
  positionId,
  tokenSymbol: positionId,
  tokenName: positionId,
  tokenAddress: `0x${positionId}`,
  chain: 'ethereum',
  positionAmount: 1,
  boughtUsd: 100,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 100,
  trades: [],
  lastTradeAt: 1,
  ...overrides,
});

describe('sumUnrealizedFromOpenPositions', () => {
  it('returns null for an empty or missing list', () => {
    expect(sumUnrealizedFromOpenPositions([])).toBeNull();
    expect(sumUnrealizedFromOpenPositions(null)).toBeNull();
    expect(sumUnrealizedFromOpenPositions(undefined)).toBeNull();
  });

  it('returns null when no counted position has both pnlValueUsd and realizedPnl', () => {
    const rows = [
      position('unpriced'),
      position('partial', { realizedPnl: 10 }),
      position('flagged', {
        flags: ['insider'],
        pnlValueUsd: 500,
        realizedPnl: 100,
      }),
    ];

    expect(sumUnrealizedFromOpenPositions(rows)).toBeNull();
  });

  it('sums pnlValueUsd minus realizedPnl for priced counted positions', () => {
    const rows = [
      position('spot', { pnlValueUsd: 150, realizedPnl: 50 }),
      position('perp', {
        chain: 'hyperliquid',
        perpPositionType: 'long',
        pnlValueUsd: -20,
        realizedPnl: 10,
      }),
    ];

    expect(sumUnrealizedFromOpenPositions(rows)).toBe(70);
  });

  it('returns 0 when priced counted positions net to zero', () => {
    const rows = [
      position('up', { pnlValueUsd: 40, realizedPnl: 10 }),
      position('down', { pnlValueUsd: -20, realizedPnl: 10 }),
    ];

    expect(sumUnrealizedFromOpenPositions(rows)).toBe(0);
  });

  it('skips unpriced and flagged rows while summing the rest', () => {
    const rows = [
      position('priced', { pnlValueUsd: 200, realizedPnl: 50 }),
      position('no-mark', { realizedPnl: 5 }),
      position('insider', {
        flags: ['insider'],
        pnlValueUsd: 999,
        realizedPnl: 1,
      }),
    ];

    expect(sumUnrealizedFromOpenPositions(rows)).toBe(150);
  });
});
