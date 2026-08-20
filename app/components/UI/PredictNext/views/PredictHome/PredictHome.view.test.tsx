import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictEventDetailTestIds } from '../PredictEventDetail/PredictEventDetail.testIds';
import { PredictFeedScreenTestIds } from '../PredictFeedScreen/PredictFeedScreen.testIds';
import type {
  PredictEntityId,
  PredictEvent,
  PredictFeedId,
  PredictTimestamp,
} from '../../types';
import { PredictEventValues } from '../../../Predict/constants/eventNames';
import {
  NCAA_FEED_SCREEN_ID,
  NFL_FEED_SCREEN_ID,
} from '../../navigation/feedScreens';

const makeEvent = (id: string, title: string): PredictEvent => ({
  venueId: 'kalshi' as PredictEvent['venueId'],
  id: id as PredictEvent['id'],
  title,
  category: 'Sports',
  volume: '1500000',
  markets: [
    {
      id: `${id}-market` as PredictEvent['markets'][number]['id'],
      question: title,
      status: 'active',
      outcomes: [
        {
          id: `${id}-yes` as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'yes',
          label: 'Yes',
          askPrice:
            '0.42' as PredictEvent['markets'][number]['outcomes'][number]['askPrice'],
        },
        {
          id: `${id}-no` as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'no',
          label: 'No',
          askPrice:
            '0.58' as PredictEvent['markets'][number]['outcomes'][number]['askPrice'],
        },
      ],
    },
  ],
});

const makeGameEvent = (
  id: string,
  awayTeam: string,
  homeTeam: string,
  competition: string,
  {
    volume = '1500000',
    score = { away: '17', home: '21' },
  }: {
    volume?: string;
    score?: { away: string; home: string };
  } = {},
): PredictEvent => ({
  ...makeEvent(id, `${awayTeam} vs ${homeTeam}`),
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
      ...makeEvent(id, '').markets[0],
      id: `${id}-away-market` as PredictEntityId,
      outcomes: [
        {
          ...makeEvent(id, '').markets[0].outcomes[0],
          gameSelection: 'away',
        },
        makeEvent(id, '').markets[0].outcomes[1],
      ],
    },
    {
      ...makeEvent(id, '').markets[0],
      id: `${id}-home-market` as PredictEntityId,
      outcomes: [
        {
          ...makeEvent(id, '').markets[0].outcomes[0],
          id: `${id}-home-yes` as PredictEntityId,
          gameSelection: 'home',
        },
        {
          ...makeEvent(id, '').markets[0].outcomes[1],
          id: `${id}-home-no` as PredictEntityId,
        },
      ],
    },
  ],
});

const nflEvents = [
  makeGameEvent('nfl-1', 'Packers', 'Steelers', 'NFL'),
  makeGameEvent('nfl-2', 'Panthers', 'Cardinals', 'NFL', {
    volume: '2500',
    score: { away: '10', home: '7' },
  }),
];
const ncaaEvents = [
  makeGameEvent('ncaa-1', 'Pittsburgh', 'Miami', 'NCAAF', {
    volume: '500',
    score: { away: '24', home: '31' },
  }),
  makeGameEvent('ncaa-2', 'Georgia', 'Florida', 'NCAAF', {
    volume: '900000',
    score: { away: '3', home: '0' },
  }),
];

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;

const configureFeeds = ({
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

const expectGameCard = (
  section: Parameters<typeof within>[0],
  eventId: string,
  {
    away,
    home,
    awayScore,
    homeScore,
    competition,
    volume,
  }: {
    away: string;
    home: string;
    awayScore: string;
    homeScore: string;
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
  expect(scoped.getByText(competition)).toBeOnTheScreen();
  expect(scoped.getByText(volume)).toBeOnTheScreen();
  expect(
    scoped.getByTestId(PredictHomeTestIds.gameQuote(eventId, 'away')),
  ).toBeOnTheScreen();
  expect(
    scoped.getByTestId(PredictHomeTestIds.gameQuote(eventId, 'home')),
  ).toBeOnTheScreen();
};

describe('PredictHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureFeeds();
  });

  it('loads the first two backend-ordered Games for both previews', async () => {
    configureFeeds({
      nfl: [...nflEvents, makeEvent('nfl-3', 'Hidden NFL Game')],
      ncaa: [...ncaaEvents, makeEvent('ncaa-3', 'Hidden College Game')],
    });
    const view = renderPredictNext();

    await waitFor(() => expect(messengerCall).toHaveBeenCalledTimes(2));

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictMarketDataService:getFeed',
      'kalshi',
      'sports-football-nfl-games',
      { limit: 2 },
      undefined,
    );
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictMarketDataService:getFeed',
      'kalshi',
      'sports-football-ncaa-games',
      { limit: 2 },
      undefined,
    );

    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-2'));

    const nflSection = view.getByTestId(
      PredictHomeTestIds.section(NFL_FEED_SCREEN_ID),
    );
    expectGameCard(nflSection, 'nfl-1', {
      away: 'Packers',
      home: 'Steelers',
      awayScore: '17',
      homeScore: '21',
      competition: 'NFL',
      volume: '$1.5M Vol',
    });
    expectGameCard(nflSection, 'nfl-2', {
      away: 'Panthers',
      home: 'Cardinals',
      awayScore: '10',
      homeScore: '7',
      competition: 'NFL',
      volume: '$2.5k Vol',
    });
    expect(
      within(nflSection).queryByText('Hidden NFL Game'),
    ).not.toBeOnTheScreen();
    expect(
      within(nflSection).queryByTestId(
        PredictHomeTestIds.event('kalshi', 'ncaa-1'),
      ),
    ).not.toBeOnTheScreen();

    const ncaaSection = view.getByTestId(
      PredictHomeTestIds.section(NCAA_FEED_SCREEN_ID),
    );
    expectGameCard(ncaaSection, 'ncaa-1', {
      away: 'Pittsburgh',
      home: 'Miami',
      awayScore: '24',
      homeScore: '31',
      competition: 'NCAAF',
      volume: '$500 Vol',
    });
    expectGameCard(ncaaSection, 'ncaa-2', {
      away: 'Georgia',
      home: 'Florida',
      awayScore: '3',
      homeScore: '0',
      competition: 'NCAAF',
      volume: '$900k Vol',
    });
    expect(
      within(ncaaSection).queryByText('Hidden College Game'),
    ).not.toBeOnTheScreen();
    expect(
      within(ncaaSection).queryByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-1'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('opens the NFL Feed Screen and returns without refetching previews', async () => {
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
    messengerCall.mockClear();

    fireEvent.press(
      view.getByTestId(PredictHomeTestIds.sectionHeader(NFL_FEED_SCREEN_ID)),
    );

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByText('Sports')).toBeOnTheScreen();
    expect(view.getByText('NFL')).toBeOnTheScreen();
    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));
    await view.findByTestId(PredictHomeTestIds.HOME);
    expect(messengerCall).not.toHaveBeenCalled();
  });

  it('opens the NCAAF Feed Screen', async () => {
    const view = renderPredictNext();

    fireEvent.press(
      await view.findByTestId(
        PredictHomeTestIds.sectionHeader(NCAA_FEED_SCREEN_ID),
      ),
    );

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByText('Sports')).toBeOnTheScreen();
    expect(view.getByText('NCAAF')).toBeOnTheScreen();
  });

  it('renders a successful NCAAF preview while NFL is still loading', async () => {
    let resolveNfl: (value: unknown) => void = () => undefined;
    messengerCall.mockImplementation(
      (action: string, _venueId: string, feedId: PredictFeedId) => {
        if (action !== 'PredictMarketDataService:getFeed') {
          return Promise.resolve(undefined);
        }
        if (feedId === 'sports-football-nfl-games') {
          return new Promise((resolve) => {
            resolveNfl = resolve;
          });
        }
        return Promise.resolve({
          venueId: 'kalshi',
          id: feedId,
          title: 'NCAAF Games',
          events: ncaaEvents,
        });
      },
    );
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.sectionLoading(NFL_FEED_SCREEN_ID)),
    ).toBeOnTheScreen();

    resolveNfl({
      venueId: 'kalshi',
      id: 'sports-football-nfl-games',
      title: 'NFL Games',
      events: nflEvents,
    });
    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).toBeOnTheScreen();
  });

  it('keeps an errored NFL preview independent from a successful NCAAF preview', async () => {
    configureFeeds({ nfl: new Error('NFL failed') });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(
        PredictHomeTestIds.sectionError(NFL_FEED_SCREEN_ID),
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.sectionError(NCAA_FEED_SCREEN_ID)),
    ).not.toBeOnTheScreen();

    configureFeeds();
    fireEvent.press(
      view.getByTestId(PredictHomeTestIds.sectionRetry(NFL_FEED_SCREEN_ID)),
    );
    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).toBeOnTheScreen();
  });

  it('keeps an empty NFL preview independent from a successful NCAAF preview', async () => {
    configureFeeds({ nfl: [] });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(
        PredictHomeTestIds.sectionEmpty(NFL_FEED_SCREEN_ID),
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).toBeOnTheScreen();
  });

  it('opens immutable Event detail from a card', async () => {
    const view = renderPredictNext();

    fireEvent.press(
      await view.findByTestId(
        PredictHomeTestIds.eventContent('kalshi', 'nfl-1'),
      ),
    );

    expect(
      await view.findByTestId(PredictEventDetailTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByText('Packers vs Steelers')).toBeOnTheScreen();
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictMarketDataService:getEvent',
      expect.anything(),
      expect.anything(),
    );
  });

  it('does not navigate when a disabled Outcome is pressed', async () => {
    const view = renderPredictNext();
    const card = await view.findByTestId(
      PredictHomeTestIds.event('kalshi', 'nfl-1'),
    );

    fireEvent.press(
      within(card).getByTestId(PredictHomeTestIds.gameQuote('nfl-1', 'away')),
    );

    expect(view.getByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictEventDetailTestIds.VIEW),
    ).not.toBeOnTheScreen();
  });

  it('tracks the homepage entry point', async () => {
    renderPredictNext({
      entryPoint: PredictEventValues.ENTRY_POINT.HOMESCREEN_BALANCE_BREAKDOWN,
    });

    await waitFor(() =>
      expect(
        Engine.context.PredictController.trackHomeViewed,
      ).toHaveBeenCalledWith({
        entryPoint: 'homescreen_balance_breakdown',
      }),
    );
  });
});
