import type {
  PredictEntityId,
  PredictEvent,
  PredictGameStatus,
  PredictTimestamp,
  PredictVenueId,
} from '../../../types';
import { isEventLive } from './isEventLive';

const event = (status?: PredictGameStatus): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'event' as PredictEntityId,
  title: 'Event',
  markets: [],
  ...(status
    ? {
        sports: {
          sport: { id: 'nfl' as PredictEntityId, label: 'NFL' },
          game: {
            status,
            awayTeam: { name: 'Away' },
            homeTeam: { name: 'Home' },
            observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
          },
        },
      }
    : {}),
});

describe('isEventLive', () => {
  it('is live while the Game is in progress', () => {
    expect(isEventLive(event('in_progress'))).toBe(true);
  });

  it.each<PredictGameStatus>([
    'scheduled',
    'delayed',
    'suspended',
    'completed',
  ])('is not live while the Game is %s', (status) => {
    expect(isEventLive(event(status))).toBe(false);
  });

  it('is never live for a non-game Event', () => {
    expect(isEventLive(event())).toBe(false);
  });
});
