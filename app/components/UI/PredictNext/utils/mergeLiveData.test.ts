import type { PredictGameLive } from '../contracts/v1/liveData';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictGame,
  PredictMarket,
  PredictTimestamp,
  PredictVenueId,
} from '../types';
import {
  isOlderLiveFrame,
  mergeGameLiveFrames,
  mergeGameLiveUpdate,
  mergeMarketQuote,
} from './mergeLiveData';

const at = (value: string) => value as PredictTimestamp;
const id = (value: string) => value as PredictEntityId;
const price = (value: string) => value as PredictDecimal;

const currentGame: PredictGame = {
  status: 'scheduled',
  homeTeam: { name: 'Home' },
  awayTeam: { name: 'Away' },
  observedAt: at('2026-09-08T12:00:00.000Z'),
};

describe('mergeGameLiveUpdate', () => {
  it('spreads the canonical fields onto the current Game', () => {
    const result = mergeGameLiveUpdate(currentGame, {
      status: 'in_progress',
      score: { away: '17', home: '21' },
      period: 'Q4',
      clock: '08:42',
      observedAt: at('2026-09-08T13:00:00.000Z'),
    });

    expect(result).toEqual({
      ...currentGame,
      status: 'in_progress',
      score: { away: '17', home: '21' },
      period: 'Q4',
      clock: '08:42',
      observedAt: '2026-09-08T13:00:00.000Z',
    });
  });

  it('keeps the current Game when the frame is older than the read model', () => {
    expect(
      mergeGameLiveUpdate(currentGame, {
        status: 'in_progress',
        observedAt: at('2026-09-08T11:00:00.000Z'),
      }),
    ).toBeUndefined();
  });

  it('treats absent fields as unchanged', () => {
    const live: PredictGame = {
      ...currentGame,
      status: 'in_progress',
      score: { away: '3', home: '0' },
      period: 'Q1',
      clock: '10:00',
    };

    const result = mergeGameLiveUpdate(live, {
      clock: '09:30',
      observedAt: at('2026-09-08T13:00:00.000Z'),
    });

    expect(result).toEqual({
      ...live,
      clock: '09:30',
      observedAt: '2026-09-08T13:00:00.000Z',
    });
  });

  it('falls back to the current status for a value outside the vocabulary', () => {
    const result = mergeGameLiveUpdate(currentGame, {
      status: 'rain_delay',
      observedAt: at('2026-09-08T13:00:00.000Z'),
    });

    expect(result?.status).toBe('scheduled');
  });

  it('keeps a newer REST score when a later clock-only frame restamps observedAt', () => {
    const rest: PredictGame = {
      ...currentGame,
      status: 'in_progress',
      score: { away: '14', home: '7' },
      observedAt: at('2026-09-08T13:00:00.000Z'),
    };
    const live = mergeGameLiveFrames(
      mergeGameLiveFrames(undefined, {
        venueId: 'kalshi' as PredictVenueId,
        eventId: id('KXTEST-EVENT'),
        type: 'football_game',
        status: 'in_progress',
        score: { away: '7', home: '0' },
        observedAt: at('2026-09-08T12:30:00.000Z'),
      }),
      {
        venueId: 'kalshi' as PredictVenueId,
        eventId: id('KXTEST-EVENT'),
        type: 'football_game',
        clock: '09:12',
        observedAt: at('2026-09-08T13:01:00.000Z'),
      },
    );
    if (!live) {
      throw new Error('expected an accumulated live Game patch');
    }

    const result = mergeGameLiveUpdate(rest, live);

    expect(result).toEqual({
      ...rest,
      clock: '09:12',
      observedAt: '2026-09-08T13:01:00.000Z',
    });
  });
});

describe('mergeGameLiveFrames', () => {
  const base: PredictGameLive = {
    venueId: 'kalshi' as PredictVenueId,
    eventId: id('KXTEST-EVENT'),
    type: 'football_game',
    observedAt: at('2026-09-08T13:00:00.000Z'),
  };

  it('returns the incoming frame when nothing has been accumulated yet', () => {
    const incoming = { ...base, status: 'in_progress' as const };

    expect(mergeGameLiveFrames(undefined, incoming)).toEqual({
      ...incoming,
      observedAtByField: { status: incoming.observedAt },
    });
  });

  it('keeps status, score, period, and clock that a later clock-only frame omits', () => {
    const previous: PredictGameLive = {
      ...base,
      status: 'in_progress',
      score: { home: '7', away: '0' },
      period: 'Q2',
      clock: '08:00',
    };

    const result = mergeGameLiveFrames(previous, {
      ...base,
      clock: '07:42',
      observedAt: at('2026-09-08T13:01:00.000Z'),
    });

    expect(result).toEqual({
      ...previous,
      clock: '07:42',
      observedAt: '2026-09-08T13:01:00.000Z',
      observedAtByField: {
        status: previous.observedAt,
        score: previous.observedAt,
        period: previous.observedAt,
        clock: '2026-09-08T13:01:00.000Z',
      },
    });
  });

  it('does not stamp a later clock onto the observedAt of carried score fields', () => {
    const previous = mergeGameLiveFrames(undefined, {
      ...base,
      status: 'in_progress',
      score: { home: '7', away: '0' },
      observedAt: at('2026-09-08T13:00:00.000Z'),
    });

    const result = mergeGameLiveFrames(previous, {
      ...base,
      clock: '07:42',
      observedAt: at('2026-09-08T13:01:00.000Z'),
    });

    expect(result?.observedAtByField).toEqual({
      status: '2026-09-08T13:00:00.000Z',
      score: '2026-09-08T13:00:00.000Z',
      clock: '2026-09-08T13:01:00.000Z',
    });
  });

  it('drops an incoming frame older than the accumulated patch', () => {
    const previous: PredictGameLive = {
      ...base,
      score: { home: '14', away: '0' },
      observedAt: at('2026-09-08T13:00:00.000Z'),
    };

    expect(
      mergeGameLiveFrames(previous, {
        ...base,
        score: { home: '7', away: '0' },
        observedAt: at('2026-09-08T12:30:00.000Z'),
      }),
    ).toBeUndefined();
  });
});

describe('isOlderLiveFrame', () => {
  it('reports an earlier frame as older than a later one', () => {
    const later = { observedAt: '2026-09-08T13:00:00.000Z' };
    const earlier = { observedAt: '2026-09-08T12:30:00.000Z' };

    expect(isOlderLiveFrame(earlier, later)).toBe(true);
    expect(isOlderLiveFrame(later, earlier)).toBe(false);
    expect(isOlderLiveFrame(later, later)).toBe(false);
  });
});

describe('mergeMarketQuote', () => {
  const currentMarket: PredictMarket = {
    id: id('KXTEST-A'),
    question: 'Will it?',
    status: 'active',
    outcomes: [
      {
        id: id('KXTEST-A:yes'),
        side: 'yes',
        label: 'Yes',
        bidPrice: price('0.40'),
        askPrice: price('0.45'),
        gameSelection: 'home',
      },
      {
        id: id('KXTEST-A:no'),
        side: 'no',
        label: 'No',
        bidPrice: price('0.55'),
        askPrice: price('0.60'),
        gameSelection: 'away',
      },
    ],
    volume: '100.00',
    updatedAt: at('2026-09-08T12:00:00.000Z'),
  };

  it('patches prices by outcome id and keeps REST-only fields', () => {
    const result = mergeMarketQuote(currentMarket, {
      outcomes: [
        {
          id: id('KXTEST-A:no'),
          side: 'no',
          bidPrice: price('0.47'),
          askPrice: price('0.55'),
        },
        {
          id: id('KXTEST-A:yes'),
          side: 'yes',
          bidPrice: price('0.45'),
          askPrice: price('0.53'),
        },
      ],
      lastPrice: price('0.50'),
      volume: '150.00',
      updatedAt: at('2026-09-08T13:00:00.000Z'),
    });

    expect(result).toEqual({
      ...currentMarket,
      outcomes: [
        {
          ...currentMarket.outcomes[0],
          bidPrice: '0.45',
          askPrice: '0.53',
        },
        {
          ...currentMarket.outcomes[1],
          bidPrice: '0.47',
          askPrice: '0.55',
        },
      ],
      lastPrice: '0.50',
      volume: '150.00',
      updatedAt: '2026-09-08T13:00:00.000Z',
    });
  });

  it('clears the last traded price for a Market the quote reports as untraded', () => {
    const traded = { ...currentMarket, lastPrice: price('0.50') };

    const result = mergeMarketQuote(traded, {
      outcomes: [
        { id: id('KXTEST-A:yes'), side: 'yes', askPrice: price('0.53') },
        { id: id('KXTEST-A:no'), side: 'no', askPrice: price('0.55') },
      ],
      updatedAt: at('2026-09-08T13:00:00.000Z'),
    });

    expect(result.lastPrice).toBeUndefined();
  });

  it('clears a side the quote reports as empty', () => {
    const result = mergeMarketQuote(currentMarket, {
      outcomes: [
        { id: id('KXTEST-A:yes'), side: 'yes', askPrice: price('0.98') },
        { id: id('KXTEST-A:no'), side: 'no', bidPrice: price('0.02') },
      ],
      updatedAt: at('2026-09-08T13:00:00.000Z'),
    });

    expect(result.outcomes[0].bidPrice).toBeUndefined();
    expect(result.outcomes[0].askPrice).toBe('0.98');
    expect(result.outcomes[1].bidPrice).toBe('0.02');
    expect(result.outcomes[1].askPrice).toBeUndefined();
    expect(result.volume).toBe('100.00');
  });

  it('leaves an outcome untouched when the quote has no matching id', () => {
    const result = mergeMarketQuote(currentMarket, {
      outcomes: [
        { id: id('OTHER:yes'), side: 'yes', askPrice: price('0.10') },
        { id: id('OTHER:no'), side: 'no', askPrice: price('0.90') },
      ],
      updatedAt: at('2026-09-08T13:00:00.000Z'),
    });

    expect(result.outcomes).toEqual(currentMarket.outcomes);
  });

  it('returns the current Market when the quote already matches', () => {
    const result = mergeMarketQuote(currentMarket, {
      outcomes: [
        {
          id: id('KXTEST-A:yes'),
          side: 'yes',
          bidPrice: price('0.40'),
          askPrice: price('0.45'),
        },
        {
          id: id('KXTEST-A:no'),
          side: 'no',
          bidPrice: price('0.55'),
          askPrice: price('0.60'),
        },
      ],
      volume: '100.00',
      updatedAt: at('2026-09-08T12:00:00.000Z'),
    });

    expect(result).toBe(currentMarket);
  });
});
