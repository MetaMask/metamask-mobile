import { within } from '@testing-library/react-native';
import Engine from '../../../app/core/Engine';
import { PredictHomeTestIds } from '../../../app/components/UI/PredictNext/views/PredictHome/PredictHome.testIds';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictFeedId,
  PredictMarket,
  PredictMarketGroup,
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

const makeStandardMarket = ({
  id,
  label,
  yesAskPrice,
  noAskPrice,
  volume,
}: {
  id: string;
  label: string;
  yesAskPrice?: string;
  noAskPrice?: string;
  volume?: string;
}): PredictMarket => ({
  id: id as PredictEntityId,
  question: `Will ${label} win?`,
  status: 'active',
  volume,
  outcomes: [
    {
      id: `${id}-yes` as PredictEntityId,
      side: 'yes',
      label,
      askPrice: yesAskPrice as PredictDecimal | undefined,
    },
    {
      id: `${id}-no` as PredictEntityId,
      side: 'no',
      label: `Not ${label}`,
      askPrice: noAskPrice as PredictDecimal | undefined,
    },
  ],
});

export const makePredictNextMultiMarketEvent = (): PredictEvent => ({
  ...makeEvent('world-series', 'Who will win the World Series?'),
  markets: [
    makeStandardMarket({
      id: 'dodgers',
      label: 'Dodgers',
      yesAskPrice: '0.38',
      noAskPrice: '0.62',
      volume: '3200000',
    }),
    makeStandardMarket({
      id: 'yankees',
      label: 'Yankees',
      yesAskPrice: '0.24',
      noAskPrice: '0.76',
      volume: '2100000',
    }),
    makeStandardMarket({
      id: 'field',
      label: 'Field',
      yesAskPrice: '0',
    }),
  ],
});

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

const spreadGroup: PredictMarketGroup = {
  key: 'spread-1',
  groupType: 'marketSelector',
  marketType: 'spread',
  option: { type: 'number', value: 3.5 },
};

export const makePredictNextComposedGameEvent = (
  id = 'nfl-composed',
): PredictEvent => {
  const event = makePredictNextGameEvent(id, 'Panthers', 'Cardinals', 'NFL', {
    askPrices: { away: '0.47', home: '0.53' },
  });
  const [awayMarket] = event.markets;

  return {
    ...event,
    markets: [
      ...event.markets,
      {
        ...awayMarket,
        id: `${id}-spread-away` as PredictEntityId,
        question: `${event.title} spread`,
        group: spreadGroup,
        outcomes: [
          {
            ...awayMarket.outcomes[0],
            id: `${id}-spread-away-yes` as PredictEntityId,
            label: 'Panthers +3.5',
            gameSelection: 'away',
          },
          {
            ...awayMarket.outcomes[1],
            id: `${id}-spread-away-no` as PredictEntityId,
          },
        ],
      },
      {
        ...awayMarket,
        id: `${id}-total` as PredictEntityId,
        question: 'Total points',
        group: {
          key: 'total-1',
          groupType: 'marketSelector',
          marketType: 'total',
          option: { type: 'number', value: 44.5 },
        },
        outcomes: [
          {
            ...awayMarket.outcomes[0],
            id: `${id}-total-yes` as PredictEntityId,
            label: 'Over',
            askPrice: '0.55' as PredictDecimal,
            gameSelection: undefined,
          },
          {
            ...awayMarket.outcomes[1],
            id: `${id}-total-no` as PredictEntityId,
            label: 'Under',
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
  details,
}: {
  nfl?: readonly PredictEvent[] | Error;
  ncaa?: readonly PredictEvent[] | Error;
  details?: readonly PredictEvent[] | Error;
} = {}) => {
  const defaultDetails = [
    ...(nfl instanceof Error ? [] : nfl),
    ...(ncaa instanceof Error ? [] : ncaa),
  ];

  messengerCall.mockImplementation(
    (action: string, _venueId: string, resourceId: string) => {
      if (action === 'PredictMarketDataService:getEvent') {
        const result = details ?? defaultDetails;
        if (result instanceof Error) {
          return Promise.reject(result);
        }

        const event = result.find(({ id }) => id === resourceId);
        return event
          ? Promise.resolve(event)
          : Promise.reject(new Error('Event not found'));
      }

      if (action !== 'PredictMarketDataService:getFeed') {
        return Promise.resolve(undefined);
      }

      const feedId = resourceId as PredictFeedId;
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

export const configurePredictNextEvent = (event: PredictEvent | Error) =>
  configurePredictNextFeeds({
    nfl: [],
    ncaa: [],
    details: event instanceof Error ? event : [event],
  });

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
