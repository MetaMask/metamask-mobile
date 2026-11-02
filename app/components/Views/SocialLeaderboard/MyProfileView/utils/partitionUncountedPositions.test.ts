import type { Position } from '@metamask/social-controllers';
import {
  filterPositionsByAsset,
  isUncountedPosition,
  listUncountedPositions,
  partitionUncountedPositions,
} from './partitionUncountedPositions';

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
  currentValueUSD: 10,
  ...overrides,
});

const ids = (rows: Position[]) => rows.map((row) => row.positionId);

describe('partitionUncountedPositions', () => {
  it('treats only a non-empty flags list as uncounted', () => {
    expect(isUncountedPosition(position('plain'))).toBe(false);
    expect(isUncountedPosition(position('empty', { flags: [] }))).toBe(false);
    expect(isUncountedPosition(position('none', { flags: null }))).toBe(false);
    expect(isUncountedPosition(position('nigel', { flags: ['insider'] }))).toBe(
      true,
    );
    expect(
      isUncountedPosition(position('moodeng', { flags: ['developer'] })),
    ).toBe(true);
    expect(isUncountedPosition(position('other', { flags: ['blocked'] }))).toBe(
      true,
    );
  });

  it('pins flagged rows to the end in input order and leaves an unflagged list alone', () => {
    const mixed = partitionUncountedPositions([
      position('LOW', { currentValueUSD: 1 }),
      position('Nigel', { flags: ['insider'], currentValueUSD: 999 }),
      position('MID', { currentValueUSD: 50 }),
      position('Moodeng', { flags: ['developer'], currentValueUSD: 2 }),
    ]);
    const plain = partitionUncountedPositions([
      position('SOL'),
      position('ETH'),
    ]);

    expect(ids(mixed.counted)).toEqual(['LOW', 'MID']);
    expect(ids(mixed.uncounted)).toEqual(['Nigel', 'Moodeng']);
    expect(ids(plain.counted)).toEqual(['SOL', 'ETH']);
    expect(plain.uncounted).toEqual([]);
  });
});

describe('filterPositionsByAsset', () => {
  const token = position('Nigel', { flags: ['insider'] });
  const perp = position('BTC', {
    flags: ['developer'],
    chain: 'hyperliquid',
    perpPositionType: 'long',
  });

  it.each([
    ['all', [perp, token], ['BTC', 'Nigel']],
    ['tokens', [token, perp], ['Nigel']],
    ['perps', [token, perp], ['BTC']],
  ] as const)('keeps %s rows in input order', (filter, rows, expected) => {
    const result = filterPositionsByAsset([...rows], filter);

    expect(ids(result)).toEqual([...expected]);
  });

  it('lists uncounted perps after the Perps filter', () => {
    const result = listUncountedPositions([token, perp], 'perps');

    expect(ids(result)).toEqual(['BTC']);
  });
});
