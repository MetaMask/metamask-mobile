import type {
  PredictEntityId,
  PredictEvent,
  PredictVenueId,
} from '../../types';
import { isFootballEvent } from './football';

const createEvent = (
  venueId: string,
  sportId: string | undefined,
): PredictEvent =>
  ({
    venueId: venueId as PredictVenueId,
    sports: sportId
      ? { sport: { id: sportId as PredictEntityId, label: sportId } }
      : undefined,
  }) as PredictEvent;

describe('isFootballEvent', () => {
  it('matches football on any venue and nothing else', () => {
    expect(
      isFootballEvent(createEvent('polymarket', 'american-football')),
    ).toBe(true);
    expect(isFootballEvent(createEvent('kalshi', 'basketball'))).toBe(false);
    expect(isFootballEvent(createEvent('kalshi', undefined))).toBe(false);
  });
});
