import type { PredictOutcome } from '../types';
import {
  getDefaultSelectedLineIndex,
  getSafeSelectedLineIndex,
  getSortedLineIndices,
  resolveSelectedLineOutcome,
} from './outcomeLines';

const createOutcome = (
  id: string,
  line: number | undefined,
  volume: number,
): PredictOutcome =>
  ({
    id,
    marketId: 'market-1',
    providerId: 'polymarket',
    title: id,
    status: 'open',
    line,
    volume,
    tokens: [{ id: `${id}-token`, title: id, price: 0.5 }],
  }) as PredictOutcome;

describe('outcomeLines', () => {
  const outcomes = [
    createOutcome('line-95', 9.5, 500),
    createOutcome('no-line', undefined, 10_000),
    createOutcome('line-85', 8.5, 100),
    createOutcome('line-105', 10.5, 50),
  ];

  it('returns line outcome indices sorted by line value', () => {
    expect(getSortedLineIndices(outcomes)).toEqual([2, 0, 3]);
  });

  it('defaults to the highest-volume outcome among line indices', () => {
    expect(getDefaultSelectedLineIndex(outcomes, [2, 0, 3])).toBe(1);
  });

  it('uses the provided selected line index when it is valid', () => {
    expect(getSafeSelectedLineIndex(outcomes, [2, 0, 3], 0)).toBe(0);
  });

  it('falls back to the default line index when selected line index is invalid', () => {
    expect(getSafeSelectedLineIndex(outcomes, [2, 0, 3], 99)).toBe(1);
  });

  it('resolves the selected line outcome', () => {
    expect(resolveSelectedLineOutcome(outcomes, 2)?.id).toBe('line-105');
  });

  it('falls back to the first outcome when no line outcomes exist', () => {
    expect(
      resolveSelectedLineOutcome([createOutcome('first', undefined, 100)])?.id,
    ).toBe('first');
  });
});
