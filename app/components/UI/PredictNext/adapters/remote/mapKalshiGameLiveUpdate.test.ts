import type { PredictGame, PredictTimestamp } from '../../types';
import { mapKalshiGameLiveUpdate } from './mapKalshiGameLiveUpdate';

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
        last_updated_ts: 1_788_525_400,
      },
    };

    const result = mapKalshiGameLiveUpdate(current, live);

    expect(result).toEqual({
      ...current,
      status: 'in_progress',
      score: { away: '17', home: '21' },
      period: 'Q4',
      clock: '08:42',
      observedAt: new Date(1_788_525_400 * 1000).toISOString(),
    });
  });

  it('ignores game types without a mobile mapper', () => {
    const live = { type: 'baseball_game', details: { status: 'live' } };

    const result = mapKalshiGameLiveUpdate(current, live);

    expect(result).toBeUndefined();
  });
});
