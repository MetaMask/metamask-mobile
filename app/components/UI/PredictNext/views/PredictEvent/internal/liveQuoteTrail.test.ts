import { renderHook } from '@testing-library/react-native';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictMarket,
  PredictOutcome,
  PredictTimestamp,
} from '../../../types';
import {
  appendLiveQuoteTrail,
  PREDICT_LIVE_QUOTE_TRAIL_LIMIT,
  useLiveQuoteTrail,
} from './liveQuoteTrail';

type QuotedMarket = Pick<PredictMarket, 'lastPrice' | 'updatedAt'>;

const history = [
  { time: Date.parse('2026-09-17T09:00:00.000Z'), value: 0.68 },
  { time: Date.parse('2026-09-17T10:00:00.000Z'), value: 0.7 },
];

const createOutcome = (
  side: PredictOutcome['side'] = 'yes',
  id = 'KXNFLGAME-26SEP17DETBUF-BUF:yes',
): PredictOutcome => ({
  id: id as PredictEntityId,
  side,
  label: 'Bills',
  askPrice: '0.88' as PredictDecimal,
  bidPrice: '0.77' as PredictDecimal,
});

const quoted = (lastPrice: string | undefined, at: string): QuotedMarket => ({
  lastPrice: lastPrice as PredictDecimal | undefined,
  updatedAt: at as PredictTimestamp,
});

const renderTrail = (
  market: QuotedMarket,
  outcome: PredictOutcome,
  isEnabled = true,
) =>
  renderHook(
    ({ quotedMarket, quotedOutcome, enabled }) =>
      useLiveQuoteTrail(quotedMarket, quotedOutcome, enabled),
    {
      initialProps: {
        quotedMarket: market,
        quotedOutcome: outcome,
        enabled: isEnabled,
      } as {
        quotedMarket: QuotedMarket;
        quotedOutcome: PredictOutcome;
        enabled: boolean;
      },
    },
  );

describe('useLiveQuoteTrail', () => {
  it('collects the last traded price once per quote', () => {
    const { result, rerender } = renderTrail(
      quoted('0.68', '2026-09-17T10:40:31.217Z'),
      createOutcome(),
    );

    rerender({
      quotedMarket: quoted('0.72', '2026-09-17T10:40:35.885Z'),
      quotedOutcome: createOutcome(),
      enabled: true,
    });

    expect(result.current).toEqual([
      { time: Date.parse('2026-09-17T10:40:31.217Z'), value: 0.68 },
      { time: Date.parse('2026-09-17T10:40:35.885Z'), value: 0.72 },
    ]);
  });

  it('complements the yes-side price for a no-side Outcome', () => {
    const { result } = renderTrail(
      quoted('0.68', '2026-09-17T10:40:31.217Z'),
      createOutcome('no', 'KXNFLGAME-26SEP17DETBUF-BUF:no'),
    );

    expect(result.current).toEqual([
      { time: Date.parse('2026-09-17T10:40:31.217Z'), value: 0.32 },
    ]);
  });

  it('keeps an unchanged price as its own point at the new quote time', () => {
    const { result, rerender } = renderTrail(
      quoted('0.68', '2026-09-17T10:40:31.217Z'),
      createOutcome(),
    );

    rerender({
      quotedMarket: quoted('0.68', '2026-09-17T10:40:41.065Z'),
      quotedOutcome: createOutcome(),
      enabled: true,
    });

    expect(result.current).toHaveLength(2);
    expect(result.current.at(-1)).toEqual({
      time: Date.parse('2026-09-17T10:40:41.065Z'),
      value: 0.68,
    });
  });

  it('ignores a quote that is not newer than the trail', () => {
    const { result, rerender } = renderTrail(
      quoted('0.68', '2026-09-17T10:40:31.217Z'),
      createOutcome(),
    );

    rerender({
      quotedMarket: quoted('0.72', '2026-09-17T10:40:20.000Z'),
      quotedOutcome: createOutcome(),
      enabled: true,
    });

    expect(result.current).toEqual([
      { time: Date.parse('2026-09-17T10:40:31.217Z'), value: 0.68 },
    ]);
  });

  it('starts over when the Outcome changes', () => {
    const { result, rerender } = renderTrail(
      quoted('0.68', '2026-09-17T10:40:31.217Z'),
      createOutcome(),
    );

    rerender({
      quotedMarket: quoted('0.26', '2026-09-17T10:40:34.120Z'),
      quotedOutcome: createOutcome('yes', 'KXNFLGAME-26SEP17DETBUF-DET:yes'),
      enabled: true,
    });

    expect(result.current).toEqual([
      { time: Date.parse('2026-09-17T10:40:34.120Z'), value: 0.26 },
    ]);
  });

  it('collects nothing for a Market that has never traded', () => {
    const { result } = renderTrail(
      quoted(undefined, '2026-09-17T10:40:31.217Z'),
      createOutcome(),
    );

    expect(result.current).toEqual([]);
  });

  it('collects nothing while the live range is not selected', () => {
    const { result, rerender } = renderTrail(
      quoted('0.68', '2026-09-17T10:40:31.217Z'),
      createOutcome(),
      false,
    );

    rerender({
      quotedMarket: quoted('0.72', '2026-09-17T10:40:35.885Z'),
      quotedOutcome: createOutcome(),
      enabled: false,
    });

    expect(result.current).toEqual([]);
  });

  it('starts over when the live range is left and selected again', () => {
    const { result, rerender } = renderTrail(
      quoted('0.68', '2026-09-17T10:40:31.217Z'),
      createOutcome(),
    );

    rerender({
      quotedMarket: quoted('0.72', '2026-09-17T10:40:35.885Z'),
      quotedOutcome: createOutcome(),
      enabled: false,
    });

    expect(result.current).toEqual([]);

    rerender({
      quotedMarket: quoted('0.74', '2026-09-17T10:40:39.512Z'),
      quotedOutcome: createOutcome(),
      enabled: true,
    });

    expect(result.current).toEqual([
      { time: Date.parse('2026-09-17T10:40:39.512Z'), value: 0.74 },
    ]);
  });

  it('drops the oldest points past the trail limit', () => {
    const start = Date.parse('2026-09-17T10:00:00.000Z');
    const { result, rerender } = renderTrail(
      quoted('0.50', new Date(start).toISOString()),
      createOutcome(),
    );

    for (let index = 1; index <= PREDICT_LIVE_QUOTE_TRAIL_LIMIT; index += 1) {
      rerender({
        quotedMarket: quoted(
          '0.50',
          new Date(start + index * 1000).toISOString(),
        ),
        quotedOutcome: createOutcome(),
        enabled: true,
      });
    }

    expect(result.current).toHaveLength(PREDICT_LIVE_QUOTE_TRAIL_LIMIT);
    expect(result.current[0].time).toBe(start + 1000);
  });
});

describe('appendLiveQuoteTrail', () => {
  it('extends the history with the trail', () => {
    const trail = [
      { time: Date.parse('2026-09-17T10:40:31.217Z'), value: 0.68 },
      { time: Date.parse('2026-09-17T10:40:35.885Z'), value: 0.72 },
    ];

    expect(appendLiveQuoteTrail(history, trail)).toEqual([
      ...history,
      ...trail,
    ]);
  });

  it('drops trail points the history already covers', () => {
    const trail = [
      { time: Date.parse('2026-09-17T09:30:00.000Z'), value: 0.6 },
      { time: Date.parse('2026-09-17T10:40:35.885Z'), value: 0.72 },
    ];

    expect(appendLiveQuoteTrail(history, trail)).toEqual([
      ...history,
      trail[1],
    ]);
  });

  it('returns the history unchanged for an empty trail', () => {
    expect(appendLiveQuoteTrail(history, [])).toBe(history);
  });

  it('plots the trail alone when there is no history', () => {
    const trail = [
      { time: Date.parse('2026-09-17T10:40:31.217Z'), value: 0.68 },
    ];

    expect(appendLiveQuoteTrail([], trail)).toEqual(trail);
  });
});
