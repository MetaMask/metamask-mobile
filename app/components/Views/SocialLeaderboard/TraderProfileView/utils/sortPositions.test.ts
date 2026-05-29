import type { Position } from '@metamask/social-controllers';
import {
  CLOSED_SORT_CYCLE,
  OPEN_SORT_CYCLE,
  sortPositions,
} from './sortPositions';

const makeOpen = (overrides: Partial<Position> = {}): Position => ({
  positionId: 'p',
  tokenSymbol: 'TKN',
  tokenName: 'Token',
  tokenAddress: '0x1',
  chain: 'base',
  positionAmount: 100,
  boughtUsd: 100,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 100,
  trades: [],
  lastTradeAt: 0,
  currentValueUSD: 0,
  pnlValueUsd: 0,
  pnlPercent: 0,
  ...overrides,
});

const makeClosed = (overrides: Partial<Position> = {}): Position =>
  makeOpen({
    positionAmount: 0,
    soldUsd: 100,
    realizedPnl: 0,
    boughtUsd: 100,
    currentValueUSD: 0,
    pnlPercent: null,
    ...overrides,
  });

describe('sortPositions', () => {
  describe('cycles', () => {
    it('exposes the Open tab cycle as [value, pnl]', () => {
      expect(OPEN_SORT_CYCLE).toEqual(['value', 'pnl']);
    });

    it('exposes the Closed tab cycle as [value, pnl, recent]', () => {
      expect(CLOSED_SORT_CYCLE).toEqual(['value', 'pnl', 'recent']);
    });
  });

  describe('open tab', () => {
    const a = makeOpen({
      positionId: 'a',
      currentValueUSD: 100,
      pnlPercent: 5,
    });
    const b = makeOpen({
      positionId: 'b',
      currentValueUSD: 300,
      pnlPercent: 1,
    });
    const c = makeOpen({
      positionId: 'c',
      currentValueUSD: 200,
      pnlPercent: 10,
    });

    it('sorts by currentValueUSD descending when sortKey is value', () => {
      const result = sortPositions([a, b, c], 'value', 'open');

      expect(result.map((p) => p.positionId)).toEqual(['b', 'c', 'a']);
    });

    it('sorts by pnlPercent descending when sortKey is pnl', () => {
      const result = sortPositions([a, b, c], 'pnl', 'open');

      expect(result.map((p) => p.positionId)).toEqual(['c', 'a', 'b']);
    });

    it('treats null currentValueUSD as 0 for value sort', () => {
      const nullValue = makeOpen({
        positionId: 'z',
        currentValueUSD: null,
        pnlPercent: 0,
      });

      const result = sortPositions([a, nullValue], 'value', 'open');

      expect(result.map((p) => p.positionId)).toEqual(['a', 'z']);
    });

    it('treats null pnlPercent as 0 for pnl sort', () => {
      const nullPnl = makeOpen({
        positionId: 'z',
        currentValueUSD: 0,
        pnlPercent: null,
      });

      const result = sortPositions([a, nullPnl], 'pnl', 'open');

      expect(result.map((p) => p.positionId)).toEqual(['a', 'z']);
    });
  });

  describe('closed tab', () => {
    const a = makeClosed({
      positionId: 'a',
      soldUsd: 1000,
      realizedPnl: 100,
      boughtUsd: 500,
      lastTradeAt: 1_000,
    });
    const b = makeClosed({
      positionId: 'b',
      soldUsd: 3000,
      realizedPnl: 30,
      boughtUsd: 1000,
      lastTradeAt: 3_000,
    });
    const c = makeClosed({
      positionId: 'c',
      soldUsd: 2000,
      realizedPnl: 500,
      boughtUsd: 1000,
      lastTradeAt: 2_000,
    });

    it('sorts by soldUsd descending when sortKey is value', () => {
      const result = sortPositions([a, b, c], 'value', 'closed');

      expect(result.map((p) => p.positionId)).toEqual(['b', 'c', 'a']);
    });

    it('sorts by realized P&L percent descending when sortKey is pnl', () => {
      const result = sortPositions([a, b, c], 'pnl', 'closed');

      expect(result.map((p) => p.positionId)).toEqual(['c', 'a', 'b']);
    });

    it('sorts by lastTradeAt descending when sortKey is recent', () => {
      const result = sortPositions([a, b, c], 'recent', 'closed');

      expect(result.map((p) => p.positionId)).toEqual(['b', 'c', 'a']);
    });

    it('treats boughtUsd === 0 as 0 P&L', () => {
      const zeroBought = makeClosed({
        positionId: 'z',
        soldUsd: 100,
        realizedPnl: 100,
        boughtUsd: 0,
        lastTradeAt: 5_000,
      });

      const result = sortPositions([zeroBought, a], 'pnl', 'closed');

      expect(result.map((p) => p.positionId)).toEqual(['a', 'z']);
    });
  });

  describe('immutability', () => {
    it('does not mutate the input array', () => {
      const input = [
        makeOpen({ positionId: 'a', currentValueUSD: 1 }),
        makeOpen({ positionId: 'b', currentValueUSD: 2 }),
      ];
      const before = input.map((p) => p.positionId);

      sortPositions(input, 'value', 'open');

      expect(input.map((p) => p.positionId)).toEqual(before);
    });
  });
});
