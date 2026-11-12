import type { Position } from '@metamask/social-controllers';
import {
  filterPositionsByAsset,
  isUncountedPosition,
  listUncountedPositions,
  partitionUncountedPositions,
  resolveUncountedNoteTarget,
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

describe('resolveUncountedNoteTarget', () => {
  const flaggedOpen = position('Nigel', { flags: ['insider'] });
  const flaggedClosed = position('Moodeng', { flags: ['developer'] });
  const flaggedPerp = position('BTC', {
    flags: ['insider'],
    chain: 'hyperliquid',
    perpPositionType: 'long',
  });

  it('counts the owner profile the same way as another trader', () => {
    const result = resolveUncountedNoteTarget({
      activeTab: 'open',
      filter: 'all',
      openPositions: [flaggedOpen],
      closedPositions: [flaggedClosed],
    });

    expect(result).toEqual({ tab: 'open', count: 1 });
  });

  it('counts only the active tab after the asset filter', () => {
    const openResult = resolveUncountedNoteTarget({
      activeTab: 'open',
      filter: 'tokens',
      openPositions: [flaggedOpen, flaggedPerp],
      closedPositions: [flaggedClosed],
    });
    const closedResult = resolveUncountedNoteTarget({
      activeTab: 'closed',
      filter: 'all',
      openPositions: [flaggedOpen],
      closedPositions: [flaggedClosed],
    });

    expect(openResult).toEqual({ tab: 'open', count: 1 });
    expect(closedResult).toEqual({ tab: 'closed', count: 1 });
  });

  it('uses Open from Posts when Open has flagged rows, otherwise Closed', () => {
    const openFirst = resolveUncountedNoteTarget({
      activeTab: 'posts',
      filter: 'all',
      openPositions: [flaggedOpen],
      closedPositions: [flaggedClosed],
    });
    const closedFallback = resolveUncountedNoteTarget({
      activeTab: 'posts',
      filter: 'all',
      openPositions: [],
      closedPositions: [flaggedClosed],
    });

    expect(openFirst).toEqual({ tab: 'open', count: 1 });
    expect(closedFallback).toEqual({ tab: 'closed', count: 1 });
  });
});
