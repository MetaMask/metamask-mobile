import '../../../../../../tests/component-view/mocks';
import { useEffect, useState } from 'react';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { createComponentViewQueryClient } from '../../../../../../tests/component-view/render';
// eslint-disable-next-line import-x/no-namespace -- spy on the named `useNetInfo` export
import * as NetInfoModule from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictFeedScreenTestIds } from '../PredictFeedScreen/PredictFeedScreen.testIds';
import { PredictError, PredictErrorCode } from '../../errors';
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

const netInfoMock = NetInfoModule.default as unknown as typeof NetInfoMock;

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
const LAYOUT_TEST_IDS = new RegExp(
  `^(${[
    PredictHomeTestIds.ACTIONS,
    PredictHomeTestIds.DIVIDER,
    PredictHomeTestIds.HOME_TRENDING,
    'predict-next-home-games-row-(?!header-|chevron-|list-|skeleton-)[a-z-]+',
    PredictHomeTestIds.CATEGORIES,
    'predict-next-home-section-(?!header-|loading-|error-|empty-|retry-)[a-z-]+',
    PredictHomeTestIds.HOME_GAMES_ERROR,
    PredictHomeTestIds.SECTIONS_UNAVAILABLE,
  ].join('|')})$`,
);
/** The test IDs of Home's sections, in display order. */
const sectionOrder = (view: ReturnType<typeof renderPredictNext>) =>
  view
    .getAllByTestId(SECTION_TEST_IDS)
    .map((section) => String(section.props.testID));
/** The test IDs of PortfolioActions, dividers, sections and status blocks, in display order. */
const layoutOrder = (view: ReturnType<typeof renderPredictNext>) =>
  view.getAllByTestId(LAYOUT_TEST_IDS).map((node) => String(node.props.testID));
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
    jest.restoreAllMocks();
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

  it('keeps the read sizes of the first resolved network tier when the tier changes', async () => {
    // A failed catalog read holds the reads; its retry re-renders Home after
    // the tier has changed.
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    configurePredictNextCatalog(
      PredictError.from(PredictErrorCode.SERVICE_DEGRADED),
    );
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.SECTIONS_ERROR);

    netInfoMock.__setMockNetInfo({
      type: 'cellular',
      isInternetReachable: true,
      details: { cellularGeneration: '3g' },
    });
    configurePredictNextCatalog(KALSHI_STATIC_VENUE_CATALOG);
    fireEvent.press(view.getByTestId(PredictHomeTestIds.SECTIONS_RETRY));
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

    expect(feedCalls()).toEqual([
      [POLITICS_TRUMP_FEED_ID, { limit: 2 }],
      [NCAA_GAMES_FEED_ID, { limit: 4 }],
      [NFL_GAMES_FEED_ID, { limit: 6 }],
    ]);
  });

  it('waits for NetInfo to answer before sizing the reads, with the catalog already cached', async () => {
    // The catalog is cached from an earlier Predict screen, and NetInfo
    // answers 3G only after Home's first commit, like the real hook after a
    // cold start. The grace period itself is unit-tested (useHomeReadSize).
    const queryClient = createComponentViewQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['PredictMarketDataService:getVenueCatalog', 'kalshi'],
    });
    messengerCall.mockClear();
    jest.spyOn(NetInfoModule, 'useNetInfo').mockImplementation(() => {
      const [state, setState] = useState<object>({ type: 'unknown' });
      useEffect(
        () =>
          setState({
            type: 'cellular',
            isInternetReachable: true,
            details: { cellularGeneration: '3g' },
          }),
        [],
      );
      return state as ReturnType<typeof NetInfoModule.useNetInfo>;
    });

    const view = renderPredictNext(false, { queryClient });

    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1')),
    ).toBeOnTheScreen();
    expect(feedCalls()).toEqual([
      [POLITICS_TRUMP_FEED_ID, { limit: 1 }],
      [NCAA_GAMES_FEED_ID, { limit: 2 }],
      [NFL_GAMES_FEED_ID, { limit: 4 }],
    ]);
  });

  it('follows a catalog the server reorders while Home is open, without reading any Feed again', async () => {
    const queryClient = createComponentViewQueryClient();
    const view = renderPredictNext(false, { queryClient });
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));
    const readsBefore = feedCalls();

    configureHome([POLITICS, TRENDING, SPORTS_ROW, CATEGORIES]);
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ['PredictMarketDataService:getVenueCatalog', 'kalshi'],
        exact: true,
      });
    });

    await waitFor(() =>
      expect(sectionOrder(view)).toEqual([
        PredictHomeTestIds.section('politics'),
        PredictHomeTestIds.HOME_TRENDING,
        PredictHomeTestIds.HOME_SPORTS,
        PredictHomeTestIds.CATEGORIES,
      ]),
    );
    expect(feedCalls()).toEqual(readsBefore);
    expect(
      within(view.getByTestId(PredictHomeTestIds.HOME_SPORTS)).getByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-4'),
      ),
    ).toBeOnTheScreen();
  });

  it('shows the unavailable state when no section has anything to show', async () => {
    // Out of season, with no Categories: the sections render nothing.
    configurePredictNextCatalog({
      ...KALSHI_STATIC_VENUE_CATALOG,
      categories: [],
      home: { sections: [TRENDING, SPORTS_ROW, CATEGORIES] },
    });
    configurePredictNextFeeds({ nfl: [], ncaa: [] });
    configurePredictNextCatalog({
      ...KALSHI_STATIC_VENUE_CATALOG,
      categories: [],
      home: { sections: [TRENDING, SPORTS_ROW, CATEGORIES] },
    });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.SECTIONS_UNAVAILABLE),
    ).toBeOnTheScreen();
    expect(view.getByTestId(PredictHomeTestIds.POSITIONS)).toBeOnTheScreen();
  });

  it('reads all eight Feeds of a full layout, and renders the eighth', async () => {
    const keys = Array.from({ length: 8 }, (_, index) => `league-${index + 1}`);
    configurePredictNextCatalog({
      ...KALSHI_STATIC_VENUE_CATALOG,
      feeds: Object.fromEntries(keys.map((key) => [key, `${key}-games`])),
      categories: [],
      home: {
        sections: keys.map((key) => ({
          kind: 'games-row',
          id: key,
          title: key,
          feed: key,
        })),
      },
    });
    const view = renderPredictNext();

    // Every Feed the fixture does not know serves the NCAAF Games, so each
    // row after the first finds them taken; the eighth read is what counts.
    await waitFor(() => expect(feedCalls()).toHaveLength(8));
    expect(feedCalls().map(([feedId]) => feedId)).toEqual(
      keys.map((key) => `${key}-games`).sort(),
    );
    expect(
      await view.findByTestId(PredictHomeTestIds.gamesRow('league-1').ROW),
    ).toBeOnTheScreen();
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

  describe('section dividers', () => {
    it('places full-bleed 24px-spaced dividers below PortfolioActions and between adjacent visible sections with no divider below Categories or trailing divider', async () => {
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_TRENDING,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_SPORTS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.CATEGORIES,
        PredictHomeTestIds.section('politics'),
      ]);

      const dividers = view.getAllByTestId(PredictHomeTestIds.DIVIDER);
      expect(dividers).toHaveLength(3);
      dividers.forEach((divider) => {
        expect(divider).toHaveStyle({
          marginTop: 0,
          marginBottom: 0,
          marginLeft: -16,
          marginRight: -16,
          borderTopWidth: 1,
        });
      });
    });

    it('omits dividers for hidden Trending and Sports rows and directly below Categories when games feeds are empty', async () => {
      configurePredictNextFeeds({ nfl: [], ncaa: [] });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
      ).not.toBeOnTheScreen();
      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.CATEGORIES,
        PredictHomeTestIds.section('politics'),
      ]);
    });

    it('omits the Sports divider and the divider directly below Categories when only the Sports row is empty', async () => {
      configurePredictNextFeeds({ nfl: [], ncaa: ncaaEvents });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
      ).not.toBeOnTheScreen();
      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_TRENDING,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.CATEGORIES,
        PredictHomeTestIds.section('politics'),
      ]);
    });

    it('omits the divider directly below Categories when the catalog places Categories before another section', async () => {
      configureHome([POLITICS, CATEGORIES, SPORTS_ROW, TRENDING]);
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));

      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.section('politics'),
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.CATEGORIES,
        PredictHomeTestIds.HOME_SPORTS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_TRENDING,
      ]);
    });

    it('omits the Categories divider when categories are empty', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        categories: [],
      });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      expect(
        view.queryByTestId(PredictHomeTestIds.CATEGORIES),
      ).not.toBeOnTheScreen();
      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_TRENDING,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_SPORTS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.section('politics'),
      ]);
    });

    it('renders no trailing divider when a Feed preview section has no read', async () => {
      const { 'politics-trump': _omitted, ...feeds } =
        KALSHI_STATIC_VENUE_CATALOG.feeds;
      configurePredictNextCatalog({ ...KALSHI_STATIC_VENUE_CATALOG, feeds });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));

      expect(
        view.queryByTestId(PredictHomeTestIds.section('politics')),
      ).not.toBeOnTheScreen();
      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_TRENDING,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_SPORTS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.CATEGORIES,
      ]);
    });

    it('never renders two dividers in a row when multiple middle sections hide', async () => {
      configurePredictNextFeeds({ nfl: [], ncaa: ncaaEvents });
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        categories: [],
      });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_TRENDING,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.section('politics'),
      ]);
    });

    it('renders only Divider 1 above a single visible Categories section', async () => {
      configurePredictNextFeeds({ nfl: [], ncaa: [] });
      configureHome([TRENDING, SPORTS_ROW, CATEGORIES]);
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.CATEGORIES);

      // The catalog lists Trending and the Sports row, so they mount first
      // and unmount once their empty data lands; wait for the layout to
      // settle before asserting it.
      await waitFor(() =>
        expect(layoutOrder(view)).toEqual([
          PredictHomeTestIds.ACTIONS,
          PredictHomeTestIds.DIVIDER,
          PredictHomeTestIds.CATEGORIES,
        ]),
      );
    });

    it('renders only Divider 1 above a single visible Feed preview section', async () => {
      configurePredictNextFeeds({ nfl: [], ncaa: [] });
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        categories: [],
      });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      // Trending and the Sports row are listed by the default catalog home
      // and unmount once their empty data lands; wait for the layout to
      // settle before asserting it.
      await waitFor(() =>
        expect(layoutOrder(view)).toEqual([
          PredictHomeTestIds.ACTIONS,
          PredictHomeTestIds.DIVIDER,
          PredictHomeTestIds.section('politics'),
        ]),
      );
    });

    it('renders zero dividers while capabilities are loading', async () => {
      configurePredictNextCatalog('pending');
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.SECTIONS_LOADING),
      ).toBeOnTheScreen();
      await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);
      expect(view.queryAllByTestId(PredictHomeTestIds.DIVIDER)).toHaveLength(0);
    });

    it('renders zero dividers when capabilities fail to load', async () => {
      configurePredictNextCatalog(
        PredictError.from(PredictErrorCode.SERVICE_DEGRADED),
      );
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.SECTIONS_ERROR),
      ).toBeOnTheScreen();
      expect(view.queryAllByTestId(PredictHomeTestIds.DIVIDER)).toHaveLength(0);
    });

    it.each([
      ['catalog has an empty home', []],
      ['catalog has no home', undefined],
    ])(
      'renders zero dividers when %s and HomeSectionsStatus is unavailable',
      async (_label, sections) => {
        configureHome(sections);
        const view = renderPredictNext();

        expect(
          await view.findByTestId(PredictHomeTestIds.SECTIONS_UNAVAILABLE),
        ).toBeOnTheScreen();
        expect(view.queryAllByTestId(PredictHomeTestIds.DIVIDER)).toHaveLength(
          0,
        );
      },
    );

    it('renders zero dividers when all configured sections are empty', async () => {
      configurePredictNextFeeds({ nfl: [], ncaa: [] });
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        categories: [],
        home: { sections: [TRENDING, SPORTS_ROW, CATEGORIES] },
      });
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.SECTIONS_UNAVAILABLE),
      ).toBeOnTheScreen();
      expect(view.queryAllByTestId(PredictHomeTestIds.DIVIDER)).toHaveLength(0);
    });

    it('separates HomeGamesError cleanly when Sports fails while Trending succeeds', async () => {
      configurePredictNextFeeds({ nfl: new Error('NFL failed') });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.HOME_GAMES_ERROR);
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
      ).not.toBeOnTheScreen();
      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_TRENDING,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_GAMES_ERROR,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.CATEGORIES,
        PredictHomeTestIds.section('politics'),
      ]);
    });

    it('updates dividers cleanly when all games reads fail and then recover on retry', async () => {
      configurePredictNextFeeds({
        nfl: new Error('NFL failed'),
        ncaa: new Error('NCAAF failed'),
      });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.HOME_GAMES_ERROR);
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_GAMES_ERROR,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.CATEGORIES,
        PredictHomeTestIds.section('politics'),
      ]);

      configurePredictNextFeeds({ nfl: NFL_GAMES });
      fireEvent.press(view.getByTestId(PredictHomeTestIds.HOME_GAMES_RETRY));

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_GAMES_ERROR),
      ).not.toBeOnTheScreen();
      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_TRENDING,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.HOME_SPORTS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.CATEGORIES,
        PredictHomeTestIds.section('politics'),
      ]);
    });

    it('renders Divider 1 without a trailing divider when only games sections exist and all fail', async () => {
      configurePredictNextFeeds({
        nfl: new Error('NFL failed'),
        ncaa: new Error('NCAAF failed'),
      });
      configureHome([TRENDING, SPORTS_ROW]);
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.HOME_GAMES_ERROR);
      await view.findByTestId(PredictHomeTestIds.SECTIONS_UNAVAILABLE);

      expect(layoutOrder(view)).toEqual([
        PredictHomeTestIds.ACTIONS,
        PredictHomeTestIds.DIVIDER,
        PredictHomeTestIds.SECTIONS_UNAVAILABLE,
        PredictHomeTestIds.HOME_GAMES_ERROR,
      ]);
    });
  });
});
