import type { PredictGame, PredictTimestamp } from '../../types';
import {
  isOlderKalshiLiveFrame,
  mapKalshiGameLiveUpdate,
} from './mapKalshiGameLiveUpdate';

const current: PredictGame = {
  status: 'scheduled',
  homeTeam: { name: 'Home' },
  awayTeam: { name: 'Away' },
  observedAt: '2026-09-08T12:00:00.000Z' as PredictTimestamp,
};

describe('mapKalshiGameLiveUpdate', () => {
  it('maps football score, status, quarter, clock, and timestamp', () => {
    const live = {
      type: 'football_game',
      details: {
        status: 'live',
        away_points: 17,
        home_points: 21,
        quarter: 4,
        clock: '08:42',
        last_updated_ts: Date.parse('2026-09-08T13:00:00.000Z') / 1000,
      },
    };

    const result = mapKalshiGameLiveUpdate(current, live);

    expect(result).toEqual({
      ...current,
      status: 'in_progress',
      score: { away: '17', home: '21' },
      period: 'Q4',
      clock: '08:42',
      observedAt: '2026-09-08T13:00:00.000Z',
    });
  });

  it('ignores game types without a mobile mapper', () => {
    const live = { type: 'baseball_game', details: { status: 'live' } };

    const result = mapKalshiGameLiveUpdate(current, live);

    expect(result).toBeUndefined();
  });

  it('keeps the current Game when the live frame is older than the read model', () => {
    const live = {
      type: 'football_game',
      details: {
        status: 'live',
        away_points: 1,
        home_points: 2,
        last_updated_ts: Date.parse('2026-09-08T11:00:00.000Z') / 1000,
      },
    };

    const result = mapKalshiGameLiveUpdate(current, live);

    expect(result).toBeUndefined();
  });
});

describe('isOlderKalshiLiveFrame', () => {
  it('reports an earlier live frame as older than a later one', () => {
    const later = {
      details: {
        last_updated_ts: Date.parse('2026-09-08T13:00:00.000Z') / 1000,
      },
    };
    const earlier = {
      details: {
        last_updated_ts: Date.parse('2026-09-08T12:30:00.000Z') / 1000,
      },
    };

    expect(isOlderKalshiLiveFrame(earlier, later)).toBe(true);
    expect(isOlderKalshiLiveFrame(later, earlier)).toBe(false);
  });

  it('treats an unstamped frame as older than a stamped one', () => {
    const stamped = {
      details: {
        last_updated_ts: Date.parse('2026-09-08T13:00:00.000Z') / 1000,
      },
    };
    const unstamped = { details: { status: 'live' } };

    expect(isOlderKalshiLiveFrame(unstamped, stamped)).toBe(true);
    expect(isOlderKalshiLiveFrame(stamped, unstamped)).toBe(false);
  });
});
