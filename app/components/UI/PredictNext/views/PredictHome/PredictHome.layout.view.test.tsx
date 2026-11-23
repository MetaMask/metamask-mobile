import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictFeedScreenTestIds } from '../PredictFeedScreen/PredictFeedScreen.testIds';
import { KALSHI_STATIC_VENUE_CATALOG } from '../../contracts/v1/fixtures/kalshiVenueCatalog';
import {
  configurePredictNextCatalog,
  configurePredictNextFeeds,
  feedScreenTabLabels,
  makePredictNextGameEvent,
  messengerCall,
  ncaaEvents,
  nflEvents,
  PREDICT_NEXT_FEED_IDS,
} from '../../../../../../tests/component-view/fixtures/predictNext';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const {
  nflGames: NFL_GAMES_FEED_ID,
  ncaaGames: NCAA_GAMES_FEED_ID,
  politicsTrump: POLITICS_TRUMP_FEED_ID,
} = PREDICT_NEXT_FEED_IDS;

const [TRENDING, SPORTS_ROW, CATEGORIES, POLITICS] =
  KALSHI_STATIC_VENUE_CATALOG.home.sections;
const COLLEGE_ROW = {
  kind: 'games-row',
  id: 'college-football',
  title: 'College Football',
  feed: 'college-football-games',
  screen: 'sports-football-ncaa',
} as const;

/** Serves Kalshi's catalog with `sections` as its Home. */
const configureHome = (sections: readonly unknown[] | undefined) =>
  configurePredictNextCatalog({
    ...KALSHI_STATIC_VENUE_CATALOG,
    home: sections === undefined ? undefined : { sections },
  });

const SECTION_TEST_IDS = new RegExp(
  `^(${[
    PredictHomeTestIds.HOME_TRENDING,
    'predict-next-home-games-row-(?!header-|chevron-|list-|skeleton-)[a-z-]+',
    PredictHomeTestIds.CATEGORIES,
    'predict-next-home-section-(?!header-|loading-|error-|empty-|retry-)[a-z-]+',
  ].join('|')})$`,
);
/** The test IDs of Home's sections, in display order. */
const sectionOrder = (view: ReturnType<typeof renderPredictNext>) =>
  view
    .getAllByTestId(SECTION_TEST_IDS)
    .map((section) => String(section.props.testID));
/** Every Feed read as [Feed ID, params], sorted: the reads start in effect
 * order, which is not display order. */
const feedCalls = () =>
  messengerCall.mock.calls
    .filter(([action]) => action === 'PredictMarketDataService:getFeed')
    .map(([, , feedId, params]) => [feedId, params])
    .sort(([a], [b]) => String(a).localeCompare(String(b)));

const NFL_GAMES = [
  ...nflEvents,
  ...['3', '4', '5', '6'].map((n) =>
    makePredictNextGameEvent(`nfl-${n}`, `Away ${n}`, `Home ${n}`, 'NFL', {
      status: 'scheduled',
      startsAt: '2026-11-15T18:00:00Z',
    }),
  ),
];

describe('PredictHome layout from the Venue catalog', () => {
  beforeEach(() => {
    messengerCall.mockClear();
    configurePredictNextFeeds({ nfl: NFL_GAMES });
  });

  afterEach(() => {
    netInfoMock.__resetMockNetInfo();
  });

  it('renders the sections in the order the catalog gives', async () => {
    configureHome([POLITICS, CATEGORIES, SPORTS_ROW, TRENDING]);
    const view = renderPredictNext();

    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));

    expect(sectionOrder(view)).toEqual([
      PredictHomeTestIds.section('politics'),
      PredictHomeTestIds.CATEGORIES,
      PredictHomeTestIds.HOME_SPORTS,
      PredictHomeTestIds.HOME_TRENDING,
    ]);
    // The Sports row now sits above Trending, so it takes the NFL Games
    // first and Trending ranks what is left.
    expect(
      within(view.getByTestId(PredictHomeTestIds.HOME_SPORTS)).getByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-1'),
      ),
    ).toBeOnTheScreen();
  });

  it('drops a section the catalog removes and never reads its Feed', async () => {
    configureHome([TRENDING, CATEGORIES]);
    const view = renderPredictNext();

    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));

    expect(sectionOrder(view)).toEqual([
      PredictHomeTestIds.HOME_TRENDING,
      PredictHomeTestIds.CATEGORIES,
    ]);
    expect(feedCalls()).toEqual([
      [NCAA_GAMES_FEED_ID, { limit: 4 }],
      [NFL_GAMES_FEED_ID, { limit: 4 }],
    ]);
  });

  it('adds a games row the catalog adds, on its own Feed, with its own title and screen', async () => {
    configurePredictNextFeeds({
      nfl: NFL_GAMES,
      ncaa: [
        ...ncaaEvents,
        makePredictNextGameEvent('ncaa-3', 'Clemson', 'Duke', 'NCAAF', {
          status: 'scheduled',
          startsAt: '2026-11-15T18:00:00Z',
        }),
      ],
    });
    configureHome([...KALSHI_STATIC_VENUE_CATALOG.home.sections, COLLEGE_ROW]);
    const view = renderPredictNext();
    const college = PredictHomeTestIds.gamesRow('college-football');

    const row = await view.findByTestId(college.ROW);
    expect(
      await within(row).findByTestId(
        PredictHomeTestIds.event('kalshi', 'ncaa-3'),
      ),
    ).toBeOnTheScreen();
    expect(view.getByTestId(college.HEADER)).toHaveTextContent(
      'College Football',
    );
    expect(sectionOrder(view).at(-1)).toBe(college.ROW);

    fireEvent.press(view.getByTestId(college.HEADER));

    const feedScreen = await view.findByTestId(PredictFeedScreenTestIds.VIEW);
    expect(feedScreenTabLabels(feedScreen)).toEqual(['Games', 'Props']);
  });

  it('fills the Sports row from the Feed the catalog names, not the NFL read', async () => {
    configureHome([
      { ...SPORTS_ROW, feed: 'college-football-games', screen: undefined },
    ]);
    const view = renderPredictNext();

    const sports = await view.findByTestId(PredictHomeTestIds.HOME_SPORTS);
    expect(
      await within(sports).findByTestId(
        PredictHomeTestIds.event('kalshi', 'ncaa-1'),
      ),
    ).toBeOnTheScreen();
    expect(feedCalls()).toEqual([[NCAA_GAMES_FEED_ID, { limit: 6 }]]);
    // Without a screen the header opens nothing.
    expect(
      view.queryByTestId(PredictHomeTestIds.HOME_SPORTS_CHEVRON),
    ).not.toBeOnTheScreen();
  });

  it('drops and skips an unknown or malformed section, and renders the rest', async () => {
    configureHome([
      { kind: 'leaderboard', id: 'top-traders' },
      TRENDING,
      { kind: 'games-row', id: 'nba', title: 'NBA', feed: 'nba-games' },
      { ...POLITICS, screen: 7 },
      CATEGORIES,
    ]);
    const view = renderPredictNext();

    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));

    expect(sectionOrder(view)).toEqual([
      PredictHomeTestIds.HOME_TRENDING,
      PredictHomeTestIds.CATEGORIES,
    ]);
  });

  it.each([
    ['has no home', undefined],
    ['has an empty home', []],
  ])(
    'shows Balance, the Portfolio actions and the unavailable state when the catalog %s',
    async (_name, sections) => {
      configureHome(sections);
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.SECTIONS_UNAVAILABLE),
      ).toBeOnTheScreen();
      expect(
        await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT),
      ).toBeOnTheScreen();
      expect(view.getByTestId(PredictHomeTestIds.POSITIONS)).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.CATEGORIES),
      ).not.toBeOnTheScreen();
      expect(feedCalls()).toEqual([]);
    },
  );

  it('shows the unavailable state when home is malformed, and keeps the rest of the catalog', async () => {
    configurePredictNextCatalog({
      ...KALSHI_STATIC_VENUE_CATALOG,
      home: 'trending,sports',
    });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.SECTIONS_UNAVAILABLE),
    ).toBeOnTheScreen();
    expect(view.getByTestId(PredictHomeTestIds.SEARCH)).toBeOnTheScreen();
    expect(feedCalls()).toEqual([]);
  });

  it('reads shorter lists on a slow cellular link', async () => {
    netInfoMock.__setMockNetInfo({
      type: 'cellular',
      isInternetReachable: true,
      details: { cellularGeneration: '3g' },
    });
    const view = renderPredictNext();

    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

    await waitFor(() =>
      expect(feedCalls()).toEqual([
        [POLITICS_TRUMP_FEED_ID, { limit: 1 }],
        [NCAA_GAMES_FEED_ID, { limit: 2 }],
        [NFL_GAMES_FEED_ID, { limit: 4 }],
      ]),
    );
  });

  describe('Feed preview states', () => {
    it('shows a localized error with Retry when its read fails', async () => {
      configurePredictNextFeeds({
        nfl: NFL_GAMES,
        politics: new Error('Politics failed'),
      });
      const view = renderPredictNext();

      const error = await view.findByTestId(
        PredictHomeTestIds.sectionError('politics'),
      );
      expect(error).toHaveTextContent('Markets couldn’t be loaded.', {
        exact: false,
      });
      expect(
        view.getByTestId(PredictHomeTestIds.sectionRetry('politics')),
      ).toHaveTextContent('Retry');
    });

    it('shows a localized empty state when its Feed has no Events', async () => {
      configurePredictNextFeeds({ nfl: NFL_GAMES, politics: [] });
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.sectionEmpty('politics')),
      ).toHaveTextContent('No markets available.');
    });

    it('labels its header button with the section title', async () => {
      const view = renderPredictNext();

      expect(
        await view.findByRole('button', { name: 'View Politics' }),
      ).toBeOnTheScreen();
    });

    it("shows the server's title for a section the app has no copy for", async () => {
      configureHome([
        {
          kind: 'feed-preview',
          id: 'trump-watch',
          title: 'Trump Watch',
          feed: 'politics-trump',
          screen: 'politics',
        },
      ]);
      const view = renderPredictNext();

      expect(
        await view.findByTestId(
          PredictHomeTestIds.sectionHeader('trump-watch'),
        ),
      ).toHaveTextContent('Trump Watch');
    });
  });
});
