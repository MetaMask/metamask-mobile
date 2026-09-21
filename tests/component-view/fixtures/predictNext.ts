import { within } from '@testing-library/react-native';
import Engine from '../../../app/core/Engine';
import { PREDICT_MARKET_TYPES } from '../../../app/components/UI/PredictNext/constants';
import type {
  PredictGameLive,
  PredictQuote,
} from '../../../app/components/UI/PredictNext/contracts/v1/liveData';
import { PredictHomeTestIds } from '../../../app/components/UI/PredictNext/views/PredictHome/PredictHome.testIds';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictFeedId,
  PredictMarket,
  PredictOutcome,
  PredictSignedAmount,
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

const makeGroupedMarket = ({
  id,
  key,
  marketType,
  option,
  displayOrder,
  yesLabel,
  noLabel,
  yesAskPrice,
  noAskPrice,
  yesGameSelection,
}: {
  id: string;
  key: string;
  marketType: (typeof PREDICT_MARKET_TYPES)[keyof typeof PREDICT_MARKET_TYPES];
  option: number;
  displayOrder: number;
  yesLabel: string;
  noLabel: string;
  yesAskPrice: string;
  noAskPrice: string;
  yesGameSelection?: PredictOutcome['gameSelection'];
}): PredictMarket => ({
  id: id as PredictEntityId,
  question: `${yesLabel} at ${option}`,
  status: 'active',
  group: {
    key,
    groupType: 'marketSelector',
    marketType,
    option: { type: 'number', value: option },
    displayOrder,
  },
  outcomes: [
    {
      id: `${id}-yes` as PredictEntityId,
      side: 'yes',
      label: yesLabel,
      askPrice: yesAskPrice as PredictDecimal,
      ...(yesGameSelection === undefined
        ? {}
        : { gameSelection: yesGameSelection }),
    },
    {
      id: `${id}-no` as PredictEntityId,
      side: 'no',
      label: noLabel,
      askPrice: noAskPrice as PredictDecimal,
    },
  ],
});

export const makePredictNextTotalsEvent = (): PredictEvent => ({
  ...makeEvent('nfl-total', 'New England vs Seattle: Total Points'),
  markets: [
    makeGroupedMarket({
      id: 'nfl-total-220-5',
      key: 'nfl-total-points',
      marketType: 'total',
      option: 220.5,
      displayOrder: 1,
      yesLabel: 'Over',
      noLabel: 'Under',
      yesAskPrice: '0.07',
      noAskPrice: '0.93',
    }),
    makeGroupedMarket({
      id: 'nfl-total-218-5',
      key: 'nfl-total-points',
      marketType: 'total',
      option: 218.5,
      displayOrder: 0,
      yesLabel: 'Over',
      noLabel: 'Under',
      yesAskPrice: '0.12',
      noAskPrice: '0.88',
    }),
  ],
});

export const makePredictNextSpreadsEvent = (): PredictEvent => ({
  ...makeEvent('nfl-spread', 'New England vs Seattle: Spread'),
  markets: [
    makeGroupedMarket({
      id: 'nfl-spread-new-england-2-5',
      key: 'nfl-spreads',
      marketType: PREDICT_MARKET_TYPES.SPREAD,
      option: -2.5,
      displayOrder: 0,
      yesLabel: 'New England',
      noLabel: 'Seattle',
      yesAskPrice: '0.46',
      noAskPrice: '0.54',
      yesGameSelection: 'home',
    }),
    makeGroupedMarket({
      id: 'nfl-spread-new-england-1-5',
      key: 'nfl-spreads',
      marketType: PREDICT_MARKET_TYPES.SPREAD,
      option: -1.5,
      displayOrder: 1,
      yesLabel: 'New England',
      noLabel: 'Seattle',
      yesAskPrice: '0.42',
      noAskPrice: '0.58',
      yesGameSelection: 'home',
    }),
    makeGroupedMarket({
      id: 'nfl-spread-seattle-1-5',
      key: 'nfl-spreads',
      marketType: PREDICT_MARKET_TYPES.SPREAD,
      option: 1.5,
      displayOrder: 2,
      yesLabel: 'Seattle',
      noLabel: 'New England',
      yesAskPrice: '0.58',
      noAskPrice: '0.42',
      yesGameSelection: 'away',
    }),
    makeGroupedMarket({
      id: 'nfl-spread-seattle-2-5',
      key: 'nfl-spreads',
      marketType: PREDICT_MARKET_TYPES.SPREAD,
      option: 2.5,
      displayOrder: 3,
      yesLabel: 'Seattle',
      noLabel: 'New England',
      yesAskPrice: '0.54',
      noAskPrice: '0.46',
      yesGameSelection: 'away',
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

export const makePredictNextCompositeGameEvent = (): PredictEvent => {
  const game = makePredictNextGameEvent(
    'nfl-composite',
    'New England',
    'Seattle',
    'NFL',
  );

  return {
    ...game,
    markets: [
      ...game.markets,
      ...makePredictNextTotalsEvent().markets,
      ...makePredictNextSpreadsEvent().markets,
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

export const makePredictNextPosition = (
  overrides: Record<string, unknown> = {},
) => ({
  venueId: 'kalshi',
  marketId: 'KXNBAGAME-26MAY12-LALBOS-LAL' as PredictEntityId,
  side: 'yes' as const,
  shares: '75.00',
  marketExposure: '41.25',
  realizedPnl: '-2.50' as PredictSignedAmount,
  updatedAt: '2026-09-01T12:00:00.000Z' as PredictTimestamp,
  context: {
    eventId: 'KXNBAGAME-26MAY12-LALBOS' as PredictEntityId,
    eventTitle: 'Lakers vs Celtics',
    marketQuestion: 'Will the Lakers win?',
    outcomeId: 'KXNBAGAME-26MAY12-LALBOS-LAL-YES' as PredictEntityId,
    outcomeLabel: 'Lakers',
  },
  ...overrides,
});

export const makePredictNextFill = (
  overrides: Record<string, unknown> = {},
) => ({
  type: 'fill' as const,
  id: 'fill-1',
  venueId: 'kalshi',
  marketId: 'KXNBAGAME-26MAY12-LALBOS-LAL' as PredictEntityId,
  outcomeSide: 'yes' as const,
  shares: '75.00',
  price: '0.55' as PredictDecimal,
  fee: '0.10',
  timestamp: '2026-09-01T12:00:00.000Z' as PredictTimestamp,
  context: {
    eventId: 'KXNBAGAME-26MAY12-LALBOS' as PredictEntityId,
    eventTitle: 'Lakers vs Celtics',
    marketQuestion: 'Will the Lakers win?',
    outcomeId: 'KXNBAGAME-26MAY12-LALBOS-LAL-YES' as PredictEntityId,
    outcomeLabel: 'Lakers',
  },
  ...overrides,
});

export const makePredictNextSettlement = (
  overrides: Record<string, unknown> = {},
) => ({
  type: 'settlement' as const,
  id: 'KXNBAGAME-20MAY01-LALBOS-LAL:2026-05-21T00:00:00.000Z',
  venueId: 'kalshi',
  marketId: 'KXNBAGAME-20MAY01-LALBOS-LAL' as PredictEntityId,
  result: 'yes' as const,
  side: 'yes' as const,
  shares: '10.00',
  proceeds: '10.00',
  costBasis: '5.20',
  timestamp: '2026-05-21T00:00:00.000Z' as PredictTimestamp,
  context: {
    eventId: 'KXNBAGAME-20MAY01-LALBOS' as PredictEntityId,
    eventTitle: 'Lakers vs Celtics',
    marketQuestion: 'Will the Lakers win?',
  },
  ...overrides,
});

const publishPredictNextLiveUpdate = (eventName: string, update: unknown) => {
  const listeners = (
    Engine.controllerMessenger.subscribe as unknown as jest.Mock
  ).mock.calls.filter(([name]) => name === eventName);

  listeners.forEach(([, listener]) => listener(update));
};

/** Delivers a live Game update to every listener the screen registered. */
export const publishPredictNextGameLiveUpdate = (update: PredictGameLive) =>
  publishPredictNextLiveUpdate(
    'PredictLiveDataService:gameLiveUpdated',
    update,
  );

/** Delivers a live market quote to every listener the screen registered. */
export const publishPredictNextQuoteUpdate = (update: PredictQuote) =>
  publishPredictNextLiveUpdate('PredictLiveDataService:quoteUpdated', update);

export const configurePredictNextFeeds = ({
  nfl = nflEvents,
  ncaa = ncaaEvents,
  details,
  positions,
  activity,
}: {
  nfl?: readonly PredictEvent[] | Error;
  ncaa?: readonly PredictEvent[] | Error;
  details?: readonly PredictEvent[] | Error;
  positions?: readonly unknown[] | Error;
  activity?: readonly unknown[] | Error;
} = {}) => {
  const defaultDetails = [
    ...(nfl instanceof Error ? [] : nfl),
    ...(ncaa instanceof Error ? [] : ncaa),
  ];

  messengerCall.mockImplementation(
    (action: string, _venueId: string, resourceId: string) => {
      if (action === 'PredictPortfolioService:getBalance') {
        return Promise.resolve({
          venueId: 'kalshi',
          currency: 'USD',
          available: '123.125',
        });
      }

      if (action === 'PredictPortfolioService:getPositions') {
        return positions instanceof Error
          ? Promise.reject(positions)
          : Promise.resolve({
              venueId: 'kalshi',
              positions: positions ?? [],
            });
      }

      if (action === 'PredictPortfolioService:getActivity') {
        return activity instanceof Error
          ? Promise.reject(activity)
          : Promise.resolve({
              venueId: 'kalshi',
              activity: activity ?? [],
            });
      }

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
    competition?: string;
    volume?: string;
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
  if (competition) {
    expect(scoped.getByText(competition)).toBeOnTheScreen();
  }
  if (volume) {
    expect(scoped.getByText(volume)).toBeOnTheScreen();
  }
};
