import type {
  PredictEntityId,
  PredictEvent,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { resolveEventCardKind } from './resolveEventCardKind';

const market = {
  id: 'market-1' as PredictEntityId,
  question: 'Who wins?',
  status: 'active' as const,
  outcomes: [
    {
      id: 'yes' as PredictEntityId,
      side: 'yes' as const,
      label: 'Yes',
    },
    {
      id: 'no' as PredictEntityId,
      side: 'no' as const,
      label: 'No',
    },
  ],
} as const;

const game = {
  status: 'scheduled' as const,
  homeTeam: { name: 'Home' },
  awayTeam: { name: 'Away' },
  observedAt: '2026-01-01T00:00:00Z' as PredictTimestamp,
};

const event = (overrides: Partial<PredictEvent> = {}): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'event-1' as PredictEntityId,
  title: 'Matchup',
  markets: [market],
  ...overrides,
});

describe('resolveEventCardKind', () => {
  it('selects the Game card for an American-football Event with a Game', () => {
    const footballEvent = event({
      sports: {
        sport: {
          id: 'american-football' as PredictEntityId,
          label: 'American football',
        },
        game,
      },
    });

    const kind = resolveEventCardKind(footballEvent);

    expect(kind).toBe('game');
  });

  it('selects the standard card for an American-football Event without a Game', () => {
    const footballEvent = event({
      sports: {
        sport: {
          id: 'american-football' as PredictEntityId,
          label: 'American football',
        },
      },
    });

    const kind = resolveEventCardKind(footballEvent);

    expect(kind).toBe('standard');
  });

  it('selects the standard card for a Game Event in an unsupported Sport', () => {
    const soccerEvent = event({
      sports: {
        sport: { id: 'soccer' as PredictEntityId, label: 'Soccer' },
        game,
      },
    });

    const kind = resolveEventCardKind(soccerEvent);

    expect(kind).toBe('standard');
  });

  it('selects the standard card when Sports context is absent', () => {
    const kind = resolveEventCardKind(event());

    expect(kind).toBe('standard');
  });
});
