import type {
  PredictEntityId,
  PredictEvent,
  PredictVenueId,
} from '../../types';
import { isFootballEvent, isMirroredTeamLogo } from './football';

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

describe('isMirroredTeamLogo', () => {
  it('mirrors the home logo of a Kalshi football Game', () => {
    const event = createEvent('kalshi', 'american-football');

    expect(isMirroredTeamLogo(event, 'home')).toBe(true);
    expect(isMirroredTeamLogo(event, 'away')).toBe(false);
  });

  it.each([
    ['another sport', 'kalshi', 'basketball'],
    ['another venue', 'polymarket', 'american-football'],
    ['no sport', 'kalshi', undefined],
  ])('keeps the home logo as sent for %s', (_, venueId, sportId) => {
    expect(isMirroredTeamLogo(createEvent(venueId, sportId), 'home')).toBe(
      false,
    );
  });
});

describe('isFootballEvent', () => {
  it('matches football on any venue and nothing else', () => {
    expect(
      isFootballEvent(createEvent('polymarket', 'american-football')),
    ).toBe(true);
    expect(isFootballEvent(createEvent('kalshi', 'basketball'))).toBe(false);
    expect(isFootballEvent(createEvent('kalshi', undefined))).toBe(false);
  });
});
