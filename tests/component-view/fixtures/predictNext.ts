import { within } from '@testing-library/react-native';
import Engine from '../../../app/core/Engine';
import { PredictHomeTestIds } from '../../../app/components/UI/PredictNext/views/PredictHome/PredictHome.testIds';
import type {
  PredictEntityId,
  PredictEvent,
  PredictFeedId,
  PredictTimestamp,
} from '../../../app/components/UI/PredictNext/types';

interface GameEventOptions {
  volume?: string;
  score?: { away: string; home: string };
  askPrices?: { away: string; home: string };
}

const makeEvent = (
  id: string,
  title: string,
  askPrices = { away: '0.42', home: '0.58' },
): PredictEvent => ({
  venueId: 'kalshi' as PredictEvent['venueId'],
  id: id as PredictEvent['id'],
  title,
  category: 'Sports',
  volume: '1500000',
  markets: [
    {
      id: `${id}-market` as PredictEntityId,
      question: title,
      status: 'active',
      outcomes: [
        {
          id: `${id}-yes` as PredictEntityId,
          side: 'yes',
          label: 'Yes',
          askPrice:
            askPrices.away as PredictEvent['markets'][number]['outcomes'][number]['askPrice'],
        },
        {
          id: `${id}-no` as PredictEntityId,
          side: 'no',
          label: 'No',
          askPrice:
            askPrices.home as PredictEvent['markets'][number]['outcomes'][number]['askPrice'],
        },
      ],
    },
  ],
});

export const makePredictNextEvent = makeEvent;

export const makePredictNextGameEvent = (
  id: string,
  awayTeam: string,
  homeTeam: string,
  competition: string,
  {
    volume = '1500000',
    score = { away: '17', home: '21' },
    askPrices = { away: '0.42', home: '0.58' },
  }: GameEventOptions = {},
): PredictEvent => {
  const event = makeEvent(id, `${awayTeam} vs ${homeTeam}`, askPrices);
  const [awayOutcome, homeOutcome] = event.markets[0].outcomes;

  return {
    ...event,
    volume,
    sports: {
      sport: {
        id: 'american-football' as PredictEntityId,
        label: 'American football',
      },
      competition: {
        id: competition.toLowerCase() as PredictEntityId,
        label: competition,
      },
      game: {
        status: 'in_progress',
        awayTeam: { name: awayTeam, abbreviation: awayTeam.slice(0, 3) },
        homeTeam: { name: homeTeam, abbreviation: homeTeam.slice(0, 3) },
        score,
        period: 'Q4',
        clock: '12:22',
        observedAt: '2026-08-19T12:00:00Z' as PredictTimestamp,
      },
    },
    markets: [
      {
        ...event.markets[0],
        id: `${id}-away-market` as PredictEntityId,
        outcomes: [{ ...awayOutcome, gameSelection: 'away' }, homeOutcome],
      },
      {
        ...event.markets[0],
        id: `${id}-home-market` as PredictEntityId,
        outcomes: [
          {
            ...awayOutcome,
            id: `${id}-home-yes` as PredictEntityId,
            askPrice: askPrices.home as typeof awayOutcome.askPrice,
            gameSelection: 'home',
          },
          {
            ...homeOutcome,
            id: `${id}-home-no` as PredictEntityId,
          },
        ],
      },
    ],
  };
};

export const nflEvents = [
  makePredictNextGameEvent('nfl-1', 'Packers', 'Steelers', 'NFL', {
    askPrices: { away: '0.41', home: '0.59' },
  }),
  makePredictNextGameEvent('nfl-2', 'Panthers', 'Cardinals', 'NFL', {
    volume: '2500',
    score: { away: '10', home: '7' },
    askPrices: { away: '0.36', home: '0.64' },
  }),
];

export const ncaaEvents = [
  makePredictNextGameEvent('ncaa-1', 'Pittsburgh', 'Miami', 'NCAAF', {
    volume: '500',
    score: { away: '24', home: '31' },
    askPrices: { away: '0.47', home: '0.53' },
  }),
  makePredictNextGameEvent('ncaa-2', 'Georgia', 'Florida', 'NCAAF', {
    volume: '900000',
    score: { away: '3', home: '0' },
    askPrices: { away: '0.55', home: '0.45' },
  }),
];

export const messengerCall = Engine.controllerMessenger
  .call as unknown as jest.Mock;

export const configurePredictNextFeeds = ({
  nfl = nflEvents,
  ncaa = ncaaEvents,
}: {
  nfl?: readonly PredictEvent[] | Error;
  ncaa?: readonly PredictEvent[] | Error;
} = {}) => {
  messengerCall.mockImplementation(
    (action: string, _venueId: string, feedId: PredictFeedId) => {
      if (action !== 'PredictMarketDataService:getFeed') {
        return Promise.resolve(undefined);
      }

      const result = feedId === 'sports-football-nfl-games' ? nfl : ncaa;
      if (result instanceof Error) {
        return Promise.reject(result);
      }

      return Promise.resolve({
        venueId: 'kalshi',
        id: feedId,
        title:
          feedId === 'sports-football-nfl-games' ? 'NFL Games' : 'NCAAF Games',
        events: result,
      });
    },
  );
};

export const expectPredictNextGameCard = (
  section: Parameters<typeof within>[0],
  eventId: string,
  {
    away,
    home,
    awayScore,
    homeScore,
    awayQuote,
    homeQuote,
    competition,
    volume,
  }: {
    away: string;
    home: string;
    awayScore: string;
    homeScore: string;
    awayQuote: string;
    homeQuote: string;
    competition: string;
    volume: string;
  },
) => {
  const card = within(section).getByTestId(
    PredictHomeTestIds.event('kalshi', eventId),
  );
  const scoped = within(card);

  expect(scoped.getByText(away)).toBeOnTheScreen();
  expect(scoped.getByText(home)).toBeOnTheScreen();
  expect(scoped.getByText(awayScore)).toBeOnTheScreen();
  expect(scoped.getByText(homeScore)).toBeOnTheScreen();
  expect(scoped.getByText(awayQuote)).toBeOnTheScreen();
  expect(scoped.getByText(homeQuote)).toBeOnTheScreen();
  expect(scoped.getByText(competition)).toBeOnTheScreen();
  expect(scoped.getByText(volume)).toBeOnTheScreen();
};
