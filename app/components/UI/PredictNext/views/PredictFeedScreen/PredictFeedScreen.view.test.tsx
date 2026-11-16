import '../../../../../../tests/component-view/mocks';
import { renderPredictFeedScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import {
  PREDICT_NEXT_FEED_IDS,
  answerPredictNextCatalog,
  configurePredictNextCatalog,
  expectPredictNextGameCard,
  feedScreenTabLabels,
  publishPredictNextGameLiveUpdate,
  resetPredictNextCatalog,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import Engine from '../../../../../core/Engine';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import {
  type PredictDecimal,
  type PredictEntityId,
  type PredictEvent,
  type PredictFeedId,
  type PredictMarket,
  type PredictOutcome,
  type PredictTimestamp,
} from '../../types';
import { KALSHI_VENUE_ID } from '../../adapters/remote/KalshiRemoteAdapter';
import {
  NCAA_FEED_SCREEN_ID,
  NFL_FEED_SCREEN_ID,
  POLITICS_FEED_SCREEN_ID,
  TRENDING_FEED_SCREEN_ID,
} from '../../navigation/feedScreens';
import { PredictEventScreenTestIds } from '../PredictEvent/PredictEventScreen.testIds';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictOrderFlowTestIds } from '../PredictOrderFlow/internal/PredictOrderFlow.testIds';
import { PredictFeedScreenTestIds } from './PredictFeedScreen.testIds';
import { KALSHI_STATIC_VENUE_CATALOG } from '../../config/venueCatalogs';

const makeOutcome = (
  id: string,
  side: 'yes' | 'no',
  gameSelection?: 'away' | 'home',
): PredictOutcome => ({
  id: id as PredictEntityId,
  side,
  label: side === 'yes' ? 'Yes' : 'No',
  askPrice: (side === 'yes' ? '0.42' : '0.58') as PredictDecimal,
  ...(gameSelection ? { gameSelection } : {}),
});

const makeMarket = (id: string, question: string): PredictMarket => ({
  id: id as PredictEntityId,
  question,
  status: 'active',
  outcomes: [makeOutcome(`${id}-yes`, 'yes'), makeOutcome(`${id}-no`, 'no')],
});

const makeEvent = (id: string, title: string): PredictEvent => ({
  venueId: KALSHI_VENUE_ID,
  id: id as PredictEntityId,
  title,
  category: 'Sports',
  volume: '1500000',
  markets: [makeMarket(`${id}-market`, title)],
});

const makeGameMarket = (
  id: string,
  question: string,
  selection: 'away' | 'home',
): PredictMarket => ({
  id: id as PredictEntityId,
  question,
  status: 'active',
  outcomes: [
    makeOutcome(`${id}-yes`, 'yes', selection),
    makeOutcome(`${id}-no`, 'no'),
  ],
});

const makeGameEvent = (id: string): PredictEvent => ({
  ...makeEvent(id, 'Packers vs Steelers'),
  sports: {
    sport: {
      id: 'american-football' as PredictEntityId,
      label: 'American football',
    },
    game: {
      status: 'in_progress',
      awayTeam: { name: 'Packers', abbreviation: 'GB' },
      homeTeam: { name: 'Steelers', abbreviation: 'PIT' },
      score: { away: '17', home: '21' },
      period: 'Q4',
      clock: '12:22',
      observedAt: '2026-08-19T12:00:00Z' as PredictTimestamp,
    },
  },
  markets: [
    makeGameMarket(`${id}-away`, 'Away team', 'away'),
    makeGameMarket(`${id}-home`, 'Home team', 'home'),
  ],
});

interface FeedPage {
  events: readonly PredictEvent[];
  nextCursor?: string;
}

type FeedResponseValue = readonly PredictEvent[] | FeedPage | Error;
type FeedResponse =
  | FeedResponseValue
  | ((cursor?: string) => FeedResponseValue);

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;
const {
  nflGames: NFL_GAMES_FEED_ID,
  nflProps: NFL_WIN_TOTALS_FEED_ID,
  ncaaGames: NCAA_GAMES_FEED_ID,
  ncaaProps: NCAA_WIN_TOTALS_FEED_ID,
} = PREDICT_NEXT_FEED_IDS;

const getFeedCalls = () =>
  messengerCall.mock.calls.filter(
    ([action]) => action === 'PredictMarketDataService:getFeed',
  );

const configureFeeds = (feeds: Partial<Record<string, FeedResponse>> = {}) => {
  messengerCall.mockImplementation(
    (
      action: string,
      venueId: string,
      feedId: PredictFeedId,
      _params: unknown,
      cursor?: string,
    ): Promise<unknown> => {
      const catalogResponse = answerPredictNextCatalog(action);
      if (catalogResponse) {
        return catalogResponse;
      }
      if (action !== 'PredictMarketDataService:getFeed') {
        return Promise.resolve(undefined);
      }

      const configured = feeds[feedId] ?? [];
      const result =
        typeof configured === 'function' ? configured(cursor) : configured;
      if (result instanceof Error) {
        return Promise.reject(result);
      }

      const page = Array.isArray(result) ? { events: result } : result;
      return Promise.resolve({
        venueId,
        id: feedId,
        title: feedId,
        ...page,
      });
    },
  );
};

const makePoliticsEvent = (id: string, title: string): PredictEvent => ({
  ...makeEvent(id, title),
  category: 'Politics',
});

const gameEvent = makeGameEvent('game-1');
const secondGameEvent = makeGameEvent('game-2');
const propsEvent = makeEvent('props-1', 'NFL Win Total');

/** Feed cards ask the live-data service for card-visible Markets only. */
const CARD_SCOPE = { marketScope: 'card' };

const liveDataCalls = () =>
  messengerCall.mock.calls.filter(([action]: [string]) =>
    action.startsWith('PredictLiveDataService:'),
  );

const renderFeedScrolledToSecondPage = async () => {
  configureFeeds({
    [NFL_GAMES_FEED_ID]: (cursor?: string) =>
      cursor
        ? { events: [secondGameEvent] }
        : { events: [gameEvent], nextCursor: 'page-2' },
  });
  const view = renderPredictFeedScreen({
    venueId: KALSHI_VENUE_ID,
    feedScreenId: NFL_FEED_SCREEN_ID,
  });
  await view.findByTestId(
    PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
  );

  await act(async () => {
    fireEvent(view.getByTestId(PredictFeedScreenTestIds.LIST), 'onEndReached');
  });
  await view.findByTestId(
    PredictHomeTestIds.event(KALSHI_VENUE_ID, secondGameEvent.id),
  );

  await act(async () => {
    fireEvent(
      view.getByTestId(PredictFeedScreenTestIds.LIST),
      'onViewableItemsChanged',
      { viewableItems: [{ item: secondGameEvent }] },
    );
  });

  return view;
};

describe('Politics Feed Screen', () => {
  const {
    politicsTrump: TRUMP_FEED_ID,
    politicsCongress: CONGRESS_FEED_ID,
    politicsIran: IRAN_FEED_ID,
  } = PREDICT_NEXT_FEED_IDS;
  const trumpEvent = makePoliticsEvent('trump-1', 'Trump approval above 45%?');
  const congressEvent = makePoliticsEvent('congress-1', 'Budget passes?');
  const iranEvent = makePoliticsEvent('iran-1', 'Ceasefire holds?');

  beforeEach(() => {
    jest.clearAllMocks();
    resetPredictNextCatalog();
    configureFeeds({
      [TRUMP_FEED_ID]: [trumpEvent],
      [CONGRESS_FEED_ID]: [congressEvent],
      [IRAN_FEED_ID]: [iranEvent],
    });
  });

  it('shows the Trump, Congress and Iran tabs in order with Trump selected', async () => {
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: POLITICS_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, trumpEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(
      feedScreenTabLabels(view.getByTestId(PredictFeedScreenTestIds.VIEW)),
    ).toEqual(['Trump', 'Congress', 'Iran']);
    expect(
      view.getByTestId(PredictFeedScreenTestIds.tab('trump')).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(getFeedCalls().map(([, , feedId]) => feedId)).toEqual([
      TRUMP_FEED_ID,
    ]);
  });

  it.each([
    { tabId: 'congress', feedId: CONGRESS_FEED_ID, event: congressEvent },
    { tabId: 'iran', feedId: IRAN_FEED_ID, event: iranEvent },
  ])(
    'lists the $tabId topic Events when that tab is selected',
    async ({ tabId, feedId, event }) => {
      const view = renderPredictFeedScreen({
        venueId: KALSHI_VENUE_ID,
        feedScreenId: POLITICS_FEED_SCREEN_ID,
      });
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, trumpEvent.id),
      );

      fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab(tabId)));

      expect(
        await view.findByTestId(
          PredictHomeTestIds.event(KALSHI_VENUE_ID, event.id),
        ),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(
          PredictHomeTestIds.event(KALSHI_VENUE_ID, trumpEvent.id),
        ),
      ).not.toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        KALSHI_VENUE_ID,
        feedId,
        { limit: 20 },
      );
    },
  );

  it('opens the Event screen from a Politics card', async () => {
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: POLITICS_FEED_SCREEN_ID,
    });

    fireEvent.press(
      await view.findByTestId(
        PredictHomeTestIds.eventContent(KALSHI_VENUE_ID, trumpEvent.id),
      ),
    );

    expect(
      await view.findByTestId(PredictEventScreenTestIds.VIEW),
    ).toBeOnTheScreen();
  });

  it('omits the Trump tab when the Venue lacks its Feed key', async () => {
    configurePredictNextCatalog({
      ...KALSHI_STATIC_VENUE_CATALOG,
      feeds: {
        'politics-congress':
          KALSHI_STATIC_VENUE_CATALOG.feeds['politics-congress'],
        'politics-iran': KALSHI_STATIC_VENUE_CATALOG.feeds['politics-iran'],
      },
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: POLITICS_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, congressEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictFeedScreenTestIds.tab('trump')),
    ).not.toBeOnTheScreen();
    expect(
      view.getByTestId(PredictFeedScreenTestIds.tab('congress')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictFeedScreenTestIds.tab('iran')),
    ).toBeOnTheScreen();
    expect(getFeedCalls().map(([, , feedId]) => feedId)).not.toContain(
      TRUMP_FEED_ID,
    );
  });
});

describe('Trending Feed Screen', () => {
  const ncaaGameEvent = makeGameEvent('ncaa-game-1');

  beforeEach(() => {
    jest.clearAllMocks();
    resetPredictNextCatalog();
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [gameEvent],
      [NCAA_GAMES_FEED_ID]: [ncaaGameEvent],
    });
  });

  it('titles the screen Trending and lists the NFL Games Feed first', async () => {
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: TRENDING_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(
      within(view.getByTestId(PredictFeedScreenTestIds.HEADER)).getByText(
        'Trending',
      ),
    ).toBeOnTheScreen();
    expect(
      feedScreenTabLabels(view.getByTestId(PredictFeedScreenTestIds.VIEW)),
    ).toEqual(['NFL', 'NCAAF']);
    expect(
      view.getByTestId(PredictFeedScreenTestIds.tab('nfl')).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getFeedCalls().map(([, venueId, feedId]) => [venueId, feedId]),
    ).toEqual([[KALSHI_VENUE_ID, NFL_GAMES_FEED_ID]]);
  });

  it('lists the college football Games Feed on the NCAAF tab', async () => {
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: TRENDING_FEED_SCREEN_ID,
    });
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('ncaaf')));

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, ncaaGameEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictMarketDataService:getFeed',
      KALSHI_VENUE_ID,
      NCAA_GAMES_FEED_ID,
      { limit: 20 },
    );
  });

  it('shows the unavailable state and reads no Feed when the Venue has neither Games Feed', async () => {
    const {
      'nfl-games': _nflGames,
      'college-football-games': _collegeGames,
      ...feeds
    } = KALSHI_STATIC_VENUE_CATALOG.feeds;
    configurePredictNextCatalog({ ...KALSHI_STATIC_VENUE_CATALOG, feeds });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: TRENDING_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.UNAVAILABLE),
    ).toBeOnTheScreen();
    expect(getFeedCalls()).toHaveLength(0);
  });
});

const invalidFeedScreenParams = {
  venueId: KALSHI_VENUE_ID,
  feedScreenId: 'missing-feed-screen',
} as unknown as Parameters<typeof renderPredictFeedScreen>[0];

describe('PredictFeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPredictNextCatalog();
    configureFeeds();
  });

  describe('Venue capabilities', () => {
    it('shows only the tabs whose Feed key the Venue supports', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        feeds: { 'nfl-props': NFL_WIN_TOTALS_FEED_ID },
      });
      configureFeeds({ [NFL_WIN_TOTALS_FEED_ID]: [gameEvent] });

      const view = renderPredictFeedScreen({
        venueId: KALSHI_VENUE_ID,
        feedScreenId: NFL_FEED_SCREEN_ID,
      });

      expect(
        await view.findByTestId(PredictFeedScreenTestIds.tab('props')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictFeedScreenTestIds.tab('games')),
      ).not.toBeOnTheScreen();
      expect(getFeedCalls().map(([, , feedId]) => feedId)).toEqual([
        NFL_WIN_TOTALS_FEED_ID,
      ]);
    });

    it('shows loading and reads no Feed while capabilities load', async () => {
      configurePredictNextCatalog('pending');

      const view = renderPredictFeedScreen({
        venueId: KALSHI_VENUE_ID,
        feedScreenId: NFL_FEED_SCREEN_ID,
      });

      expect(
        await view.findByTestId(PredictFeedScreenTestIds.LOADING),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictFeedScreenTestIds.TABS),
      ).not.toBeOnTheScreen();
      expect(getFeedCalls()).toHaveLength(0);
    });

    it('retries a failed capability read and then loads the Feed', async () => {
      configurePredictNextCatalog(new Error('Catalog unavailable'));

      const view = renderPredictFeedScreen({
        venueId: KALSHI_VENUE_ID,
        feedScreenId: NFL_FEED_SCREEN_ID,
      });

      expect(
        await view.findByTestId(PredictFeedScreenTestIds.ERROR),
      ).toBeOnTheScreen();
      expect(getFeedCalls()).toHaveLength(0);

      configurePredictNextCatalog(KALSHI_STATIC_VENUE_CATALOG);
      fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.RETRY));

      expect(
        await view.findByTestId(PredictFeedScreenTestIds.tab('games')),
      ).toBeOnTheScreen();
      await waitFor(() => expect(getFeedCalls()).toHaveLength(1));
    });

    it.each([
      ['no supported tab', { ...KALSHI_STATIC_VENUE_CATALOG, feeds: {} }],
      ['a malformed catalog', { venueId: 'kalshi', feeds: [] }],
    ])('shows the unavailable state for %s', async (_name, catalog) => {
      configurePredictNextCatalog(catalog);

      const view = renderPredictFeedScreen({
        venueId: KALSHI_VENUE_ID,
        feedScreenId: NFL_FEED_SCREEN_ID,
      });

      expect(
        await view.findByTestId(PredictFeedScreenTestIds.UNAVAILABLE),
      ).toBeOnTheScreen();
      expect(getFeedCalls()).toHaveLength(0);
    });
  });

  it('shows an unavailable state for an unknown Feed Screen and returns Home', async () => {
    const view = renderPredictFeedScreen(invalidFeedScreenParams);

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.UNAVAILABLE),
    ).toBeOnTheScreen();
    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));

    expect(await view.findByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
  });

  it.each([
    {
      feedScreenId: NFL_FEED_SCREEN_ID,
      feedId: NFL_GAMES_FEED_ID,
      event: gameEvent,
      label: 'NFL',
    },
    {
      feedScreenId: NCAA_FEED_SCREEN_ID,
      feedId: NCAA_GAMES_FEED_ID,
      event: secondGameEvent,
      label: 'NCAAF',
    },
  ] as const)(
    'uses the default Games Feed for $label',
    async ({ feedScreenId, feedId, event }) => {
      configureFeeds({ [feedId]: [event] });

      const view = renderPredictFeedScreen({
        venueId: KALSHI_VENUE_ID,
        feedScreenId,
      });

      expect(
        await view.findByTestId(
          PredictHomeTestIds.event(KALSHI_VENUE_ID, event.id),
        ),
      ).toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        KALSHI_VENUE_ID,
        feedId,
        { limit: 20 },
      );
    },
  );

  it.each([
    {
      feedScreenId: NFL_FEED_SCREEN_ID,
      feedId: NFL_WIN_TOTALS_FEED_ID,
      label: 'NFL',
    },
    {
      feedScreenId: NCAA_FEED_SCREEN_ID,
      feedId: NCAA_WIN_TOTALS_FEED_ID,
      label: 'NCAAF',
    },
  ] as const)(
    'uses the Win Totals Feed for the $label Props tab',
    async ({ feedScreenId, feedId }) => {
      configureFeeds({ [feedId]: [propsEvent] });

      const view = renderPredictFeedScreen({
        venueId: KALSHI_VENUE_ID,
        feedScreenId,
        selectedTabId: 'props',
      });

      expect(
        await view.findByTestId(
          PredictHomeTestIds.event(KALSHI_VENUE_ID, propsEvent.id),
        ),
      ).toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        KALSHI_VENUE_ID,
        feedId,
        { limit: 20 },
      );
    },
  );

  it('switches between Games and Props with independent cached state', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [gameEvent],
      [NFL_WIN_TOTALS_FEED_ID]: [propsEvent],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictFeedScreenTestIds.tab('games')).props
        .accessibilityState,
    ).toEqual({ selected: true });

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('props')));

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, propsEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).not.toBeOnTheScreen();
    expect(
      view.getByTestId(PredictFeedScreenTestIds.tab('props')).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictMarketDataService:getFeed',
      KALSHI_VENUE_ID,
      NFL_WIN_TOTALS_FEED_ID,
      { limit: 20 },
    );

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('games')));

    expect(
      view.queryByTestId(PredictFeedScreenTestIds.LOADING),
    ).not.toBeOnTheScreen();
    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(getFeedCalls()).toHaveLength(3);
  });

  it('keeps the loaded Feed when the selected tab is pressed again', async () => {
    configureFeeds({ [NFL_GAMES_FEED_ID]: [gameEvent] });
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('games')));

    expect(
      view.getByTestId(PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id)),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictFeedScreenTestIds.LOADING),
    ).not.toBeOnTheScreen();
    expect(getFeedCalls()).toHaveLength(1);
  });

  it('shows loading and then renders the loaded Events', async () => {
    let resolveFeed: (value: unknown) => void = () => undefined;
    messengerCall.mockImplementation(
      (action: string): Promise<unknown> =>
        answerPredictNextCatalog(action) ??
        (action === 'PredictMarketDataService:getFeed'
          ? new Promise((resolve) => {
              resolveFeed = resolve;
            })
          : Promise.resolve(undefined)),
    );

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    // Capabilities and the Feed share LOADING. The catalog promise can
    // unmount the capabilities skeleton between findBy and toBeOnTheScreen.
    // Wait until getFeed is in flight, then re-query the Feed loading node.
    await waitFor(() => {
      expect(getFeedCalls()).toHaveLength(1);
      expect(
        view.getByTestId(PredictFeedScreenTestIds.LOADING),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      resolveFeed({
        venueId: KALSHI_VENUE_ID,
        id: NFL_GAMES_FEED_ID,
        title: 'NFL Games',
        events: [gameEvent],
      });
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
  });

  it('retries an initial error and renders the Events after recovery', async () => {
    let shouldFail = true;
    configureFeeds({
      [NFL_GAMES_FEED_ID]: () =>
        shouldFail ? new Error('Feed unavailable') : [gameEvent],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.ERROR),
    ).toBeOnTheScreen();

    shouldFail = false;
    await act(async () => {
      fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.RETRY));
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
  });

  it('renders an empty Props state without affecting the Games tab', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [gameEvent],
      [NFL_WIN_TOTALS_FEED_ID]: [],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
      selectedTabId: 'props',
    });

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.EMPTY),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).not.toBeOnTheScreen();

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('games')));

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
  });

  it('fetches the next page and shows its loading state', async () => {
    let resolveNextPage: (value: unknown) => void = () => undefined;
    messengerCall.mockImplementation(
      (
        action: string,
        venueId: string,
        feedId: PredictFeedId,
        _params: unknown,
        cursor?: string,
      ): Promise<unknown> => {
        const catalogResponse = answerPredictNextCatalog(action);
        if (catalogResponse) {
          return catalogResponse;
        }
        if (action !== 'PredictMarketDataService:getFeed') {
          return Promise.resolve(undefined);
        }
        if (cursor) {
          return new Promise((resolve) => {
            resolveNextPage = resolve;
          });
        }
        return Promise.resolve({
          venueId,
          id: feedId,
          title: 'NFL Games',
          events: [gameEvent],
          nextCursor: 'page-2',
        });
      },
    );

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );

    await act(async () => {
      fireEvent(
        view.getByTestId(PredictFeedScreenTestIds.LIST),
        'onEndReached',
      );
    });

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.NEXT_PAGE_LOADING),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveNextPage({
        venueId: KALSHI_VENUE_ID,
        id: NFL_GAMES_FEED_ID,
        title: 'NFL Games',
        events: [secondGameEvent],
      });
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, secondGameEvent.id),
      ),
    ).toBeOnTheScreen();
  });

  it('uses the correct card composition for each Event type', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [gameEvent, propsEvent],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.gameQuote(gameEvent.id, 'away'),
      ),
    ).toBeOnTheScreen();
    const gameCard = view.getByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );
    expectPredictNextGameCard(gameCard, gameEvent.id, {
      away: 'Packers',
      home: 'Steelers',
      awayScore: '17',
      homeScore: '21',
      awayQuote: /^GB\s*· 42¢$/,
      homeQuote: /^PIT\s*· 42¢$/,
    });

    const propsCard = view.getByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, propsEvent.id),
    );
    expect(within(propsCard).getByText(propsEvent.title)).toBeOnTheScreen();
    expect(
      within(propsCard).getByTestId(
        PredictHomeTestIds.outcome(propsEvent.id, 'yes'),
      ),
    ).toBeOnTheScreen();
    expect(within(propsCard).queryByText('Sports')).not.toBeOnTheScreen();
    expect(within(propsCard).getByText('$1.5M')).toBeOnTheScreen();
  });

  it('shows a binary non-game Event as the default card with Yes and No rows', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [propsEvent],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    const card = await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, propsEvent.id),
    );
    expect(
      within(card).getByTestId(
        PredictHomeTestIds.outcome(propsEvent.id, 'yes'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(card).getByTestId(PredictHomeTestIds.outcome(propsEvent.id, 'no')),
    ).toBeOnTheScreen();
    expect(
      within(card).queryByTestId(PredictHomeTestIds.category(propsEvent.id)),
    ).not.toBeOnTheScreen();
  });

  it('opens the Order flow from a tradeable Outcome row', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [propsEvent],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    fireEvent.press(
      await view.findByTestId(PredictHomeTestIds.outcome(propsEvent.id, 'yes')),
    );

    expect(
      await view.findByTestId(PredictOrderFlowTestIds.SHEET),
    ).toBeOnTheScreen();
  });

  it('keeps a quote-less Outcome row unpressable', async () => {
    const [yesOutcome, noOutcome] = propsEvent.markets[0].outcomes;
    const quoteLessEvent: PredictEvent = {
      ...propsEvent,
      markets: [
        {
          ...propsEvent.markets[0],
          outcomes: [
            { ...yesOutcome, askPrice: undefined },
            { ...noOutcome, askPrice: undefined },
          ],
        },
      ],
    };
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [quoteLessEvent],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    // The row stays visible (a missing Ask Price is not a zero price) but
    // cannot start the Order flow.
    const row = await view.findByTestId(
      PredictHomeTestIds.outcome(quoteLessEvent.id, 'yes'),
    );
    expect(row).toBeDisabled();
    fireEvent.press(row);
    expect(
      view.queryByTestId(PredictOrderFlowTestIds.SHEET),
    ).not.toBeOnTheScreen();
  });

  it('applies live Game updates to a Feed card', async () => {
    configureFeeds({ [NFL_GAMES_FEED_ID]: [gameEvent] });
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );

    act(() => {
      publishPredictNextGameLiveUpdate({
        venueId: KALSHI_VENUE_ID,
        eventId: gameEvent.id,
        type: 'football_game',
        status: 'in_progress',
        score: { away: '28', home: '24' },
        period: 'Q4',
        clock: '01:12',
        observedAt: '2026-09-11T03:00:00.000Z' as PredictTimestamp,
      });
    });

    const card = within(
      view.getByTestId(PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id)),
    );
    expect(card.getByText('28')).toBeOnTheScreen();
    expect(card.getByText('24')).toBeOnTheScreen();
    expect(card.getByText('Q4 · 01:12')).toBeOnTheScreen();
  });

  it('watches only the Events on the active tab', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [gameEvent],
      [NFL_WIN_TOTALS_FEED_ID]: [propsEvent],
    });
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictLiveDataService:watchEvents',
      KALSHI_VENUE_ID,
      [gameEvent.id],
      CARD_SCOPE,
    );

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('props')));
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, propsEvent.id),
    );

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictLiveDataService:unwatchEvents',
      KALSHI_VENUE_ID,
      [gameEvent.id],
      CARD_SCOPE,
    );
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictLiveDataService:watchEvents',
      KALSHI_VENUE_ID,
      [propsEvent.id],
      CARD_SCOPE,
    );
  });

  it('keeps watching the new tab after a delayed viewability update from the previous tab', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [gameEvent],
      [NFL_WIN_TOTALS_FEED_ID]: [propsEvent],
    });
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('props')));
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, propsEvent.id),
    );
    await act(async () => {
      fireEvent(
        view.getByTestId(PredictFeedScreenTestIds.LIST),
        'onViewableItemsChanged',
        { viewableItems: [{ item: propsEvent }] },
      );
    });

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('games')));
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );
    messengerCall.mockClear();
    await act(async () => {
      fireEvent(
        view.getByTestId(PredictFeedScreenTestIds.LIST),
        'onViewableItemsChanged',
        { viewableItems: [{ item: propsEvent }] },
      );
    });

    expect(liveDataCalls()).toEqual([]);
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictLiveDataService:unwatchEvents',
      KALSHI_VENUE_ID,
      [gameEvent.id],
      CARD_SCOPE,
    );
  });

  it('watches only the visible Feed Events after pagination', async () => {
    await renderFeedScrolledToSecondPage();

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictLiveDataService:unwatchEvents',
      KALSHI_VENUE_ID,
      [gameEvent.id],
      CARD_SCOPE,
    );
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictLiveDataService:watchEvents',
      KALSHI_VENUE_ID,
      [secondGameEvent.id],
      CARD_SCOPE,
    );
  });

  it('releases every Feed watch while an Event Screen is on top and rewatches on return', async () => {
    configureFeeds({ [NFL_GAMES_FEED_ID]: [gameEvent] });
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );
    messengerCall.mockClear();

    fireEvent.press(
      view.getByTestId(PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id)),
    );
    await view.findByTestId(PredictEventScreenTestIds.VIEW);

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictLiveDataService:unwatchEvents',
      KALSHI_VENUE_ID,
      [gameEvent.id],
      CARD_SCOPE,
    );

    messengerCall.mockClear();
    fireEvent.press(view.getByTestId(PredictEventScreenTestIds.BACK));
    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictLiveDataService:watchEvents',
        KALSHI_VENUE_ID,
        [gameEvent.id],
        CARD_SCOPE,
      ),
    );
  });

  it('keeps watching the last measured Events when a scroll reports nothing viewable', async () => {
    const view = await renderFeedScrolledToSecondPage();
    messengerCall.mockClear();

    await act(async () => {
      fireEvent(
        view.getByTestId(PredictFeedScreenTestIds.LIST),
        'onViewableItemsChanged',
        { viewableItems: [] },
      );
    });

    expect(liveDataCalls()).toEqual([]);
  });
});
