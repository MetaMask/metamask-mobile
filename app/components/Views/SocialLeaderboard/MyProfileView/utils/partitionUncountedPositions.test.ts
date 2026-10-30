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

describe('partitionUncountedPositions', () => {
  it('returns false when flags are missing or empty', () => {
    expect(isUncountedPosition(position('plain'))).toBe(false);
    expect(isUncountedPosition(position('empty', { flags: [] }))).toBe(false);
    expect(isUncountedPosition(position('none', { flags: null }))).toBe(false);
  });

  it('treats insider, developer, and other flags as uncounted', () => {
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

  it('pins flagged rows to the end without sorting either group by value', () => {
    const low = position('LOW', { currentValueUSD: 1 });
    const flaggedHigh = position('Nigel', {
      flags: ['insider'],
      currentValueUSD: 999,
    });
    const mid = position('MID', { currentValueUSD: 50 });
    const flaggedLow = position('Moodeng', {
      flags: ['developer'],
      currentValueUSD: 2,
    });

    const result = partitionUncountedPositions([
      low,
      flaggedHigh,
      mid,
      flaggedLow,
    ]);

    expect(result.counted.map((row) => row.positionId)).toEqual(['LOW', 'MID']);
    expect(result.uncounted.map((row) => row.positionId)).toEqual([
      'Nigel',
      'Moodeng',
    ]);
  });

  it('keeps an all-unflagged list in input order with an empty uncounted group', () => {
    const first = position('ETH');
    const second = position('SOL');

    const result = partitionUncountedPositions([second, first]);

    expect(result.counted.map((row) => row.positionId)).toEqual(['SOL', 'ETH']);
    expect(result.uncounted).toEqual([]);
  });
});

describe('filterPositionsByAsset', () => {
  const token = position('Nigel', { flags: ['insider'] });
  const perp = position('BTC', {
    flags: ['developer'],
    chain: 'hyperliquid',
    perpPositionType: 'long',
  });

  it('keeps mixed input order for the All filter', () => {
    const result = filterPositionsByAsset([perp, token], 'all');

    expect(result.map((row) => row.positionId)).toEqual(['BTC', 'Nigel']);
  });

  it('drops perps for Tokens and tokens for Perps', () => {
    expect(
      filterPositionsByAsset([token, perp], 'tokens').map(
        (row) => row.positionId,
      ),
    ).toEqual(['Nigel']);
    expect(
      listUncountedPositions([token, perp], 'perps').map(
        (row) => row.positionId,
      ),
    ).toEqual(['BTC']);
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

  it('returns no note on the owner profile', () => {
    const result = resolveUncountedNoteTarget({
      showFlaggedState: false,
      activeTab: 'open',
      filter: 'all',
      openPositions: [flaggedOpen],
      closedPositions: [flaggedClosed],
    });

    expect(result).toEqual({ tab: 'open', count: 0 });
  });

  it('counts only the active tab after the asset filter', () => {
    const openResult = resolveUncountedNoteTarget({
      showFlaggedState: true,
      activeTab: 'open',
      filter: 'tokens',
      openPositions: [flaggedOpen, flaggedPerp],
      closedPositions: [flaggedClosed],
    });
    const closedResult = resolveUncountedNoteTarget({
      showFlaggedState: true,
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
      showFlaggedState: true,
      activeTab: 'posts',
      filter: 'all',
      openPositions: [flaggedOpen],
      closedPositions: [flaggedClosed],
    });
    const closedFallback = resolveUncountedNoteTarget({
      showFlaggedState: true,
      activeTab: 'posts',
      filter: 'all',
      openPositions: [],
      closedPositions: [flaggedClosed],
    });

    expect(openFirst).toEqual({ tab: 'open', count: 1 });
    expect(closedFallback).toEqual({ tab: 'closed', count: 1 });
  });
});
