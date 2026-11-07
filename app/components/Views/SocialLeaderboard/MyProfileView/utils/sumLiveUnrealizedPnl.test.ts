import type { Position } from '@metamask/social-controllers';
import {
  buildLiveUnrealizedEntries,
  sumLiveUnrealizedPnl,
} from './sumLiveUnrealizedPnl';
import { sumUnrealizedFromOpenPositions } from './sumUnrealizedFromOpenPositions';

const spotPosition = (overrides: Partial<Position> = {}): Position => ({
  positionId: 'spot-1',
  tokenSymbol: 'TKN',
  tokenName: 'Token',
  tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
  chain: 'base',
  positionAmount: 100,
  isOpen: true,
  boughtUsd: 500,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 500,
  trades: [],
  lastTradeAt: 1,
  currentValueUSD: 600,
  // realized 0 + (600 - 500)
  pnlValueUsd: 100,
  pnlPercent: 20,
  ...overrides,
});

describe('buildLiveUnrealizedEntries', () => {
  it('counts the same rows as the API sum', () => {
    const positions = [
      spotPosition(),
      spotPosition({ positionId: 'flagged', flags: ['insider'] }),
      spotPosition({ positionId: 'unpriced', pnlValueUsd: null }),
    ];

    const entries = buildLiveUnrealizedEntries(positions);

    expect(entries.map((entry) => entry.position.positionId)).toEqual([
      'spot-1',
    ]);
    expect(sumLiveUnrealizedPnl(entries, () => undefined)).toBe(
      sumUnrealizedFromOpenPositions(positions),
    );
  });

  it('is empty when there are no open positions', () => {
    expect(buildLiveUnrealizedEntries([])).toEqual([]);
    expect(sumLiveUnrealizedPnl([], () => undefined)).toBeNull();
  });
});

describe('sumLiveUnrealizedPnl', () => {
  it('keeps the API figure until a price arrives', () => {
    const entries = buildLiveUnrealizedEntries([spotPosition()]);

    expect(sumLiveUnrealizedPnl(entries, () => undefined)).toBe(100);
  });

  it('moves unrealized with the streamed price', () => {
    const entries = buildLiveUnrealizedEntries([spotPosition()]);
    const key = entries[0].source?.key;

    expect(key).toBeDefined();
    // Snapshot price is 600 / 100 = 6. Price 7 is +1 per token on 100 tokens.
    expect(
      sumLiveUnrealizedPnl(entries, (priceKey) =>
        priceKey === key ? 7 : undefined,
      ),
    ).toBeCloseTo(200);
  });

  it('keeps realized P&L out of the live figure', () => {
    const entries = buildLiveUnrealizedEntries([
      spotPosition({ realizedPnl: 40, pnlValueUsd: 140 }),
    ]);
    const key = entries[0].source?.key;

    expect(
      sumLiveUnrealizedPnl(entries, (priceKey) =>
        priceKey === key ? 7 : undefined,
      ),
    ).toBeCloseTo(200);
  });

  it('sums positions with and without a streamed price', () => {
    const entries = buildLiveUnrealizedEntries([
      spotPosition(),
      spotPosition({
        positionId: 'spot-2',
        tokenAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        chain: 'ethereum',
        pnlValueUsd: -30,
        currentValueUSD: 470,
      }),
    ]);
    const firstKey = entries[0].source?.key;

    expect(firstKey).toBeDefined();
    expect(firstKey).not.toBe(entries[1].source?.key);
    expect(
      sumLiveUnrealizedPnl(entries, (priceKey) =>
        priceKey === firstKey ? 7 : undefined,
      ),
    ).toBeCloseTo(170);
  });
});
