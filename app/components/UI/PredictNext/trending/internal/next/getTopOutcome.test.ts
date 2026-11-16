import type {
  PredictEvent,
  PredictGame,
  PredictMarket,
  PredictMarketStatus,
} from '../../../types';
import { getTopOutcome } from './getTopOutcome';

const market = (
  id: string,
  yesAsk: string | undefined,
  {
    label = id,
    status = 'active',
    gameSelection,
  }: {
    label?: string;
    status?: PredictMarketStatus;
    gameSelection?: 'home' | 'away';
  } = {},
) =>
  ({
    id,
    question: `Will ${label} win?`,
    status,
    outcomes: [
      { id: `${id}-yes`, side: 'yes', label, askPrice: yesAsk, gameSelection },
      { id: `${id}-no`, side: 'no', label: `Not ${label}`, askPrice: '0.5' },
    ],
  }) as unknown as PredictMarket;

const event = (
  markets: PredictMarket[],
  game?: Partial<PredictGame>,
): PredictEvent =>
  ({
    venueId: 'kalshi',
    id: 'event-1',
    title: 'Event',
    markets,
    ...(game
      ? {
          sports: {
            sport: { id: 'football', label: 'Football' },
            game: {
              status: 'scheduled',
              awayTeam: { name: 'Bills' },
              homeTeam: { name: 'Chiefs' },
              observedAt: '2026-11-05T00:00:00Z',
              ...game,
            },
          },
        }
      : {}),
  }) as unknown as PredictEvent;

describe('getTopOutcome', () => {
  it("names a Game's favourite Team from its full-game moneyline", () => {
    const game = event(
      [
        market('away', '0.35', { gameSelection: 'away' }),
        market('home', '0.66', { gameSelection: 'home' }),
      ],
      {},
    );

    expect(getTopOutcome(game)).toEqual({
      percent: 66,
      label: 'Chiefs',
      team: { name: 'Chiefs' },
    });
  });

  it("names a single Market's question", () => {
    expect(getTopOutcome(event([market('rain', '0.2')]))).toEqual({
      percent: 20,
      label: 'Will rain win?',
    });
  });

  it('names the most likely Yes Outcome of a multi-Market Event', () => {
    const result = getTopOutcome(
      event([market('a', '0.1'), market('b', '0.7'), market('c', '0.2')]),
    );

    expect(result).toEqual({ percent: 70, label: 'b' });
  });

  it('skips Markets that are not active or have no Ask Price', () => {
    const result = getTopOutcome(
      event([
        market('closed', '0.9', { status: 'closed' }),
        market('unquoted', undefined),
        market('open', '0.3'),
      ]),
    );

    expect(result).toEqual({ percent: 30, label: 'open' });
  });

  it('is undefined when no Outcome has a buy quote', () => {
    expect(getTopOutcome(event([market('a', undefined)]))).toBeUndefined();
  });
});
