import '../../../../../tests/component-view/mocks';
import { renderTrendingViewWithRoutes } from '../../../../../tests/component-view/renderers/trending';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  clearTrendingApiMocks,
  mockTrendingTokensData,
  setupTrendingApiFetchMock,
} from '../../../../../tests/component-view/api-mocking/trending';
import { MOCK_PREDICT_MARKET } from '../../../../../tests/component-view/fixtures/predict';
import { TrendingViewSelectorsIDs } from '../../../Views/TrendingView/TrendingView.testIds';
import { ExploreSearchScreenSelectorsIDs } from '../../../Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.testIds';
import {
  act,
  fireEvent,
  userEvent,
  waitFor,
  within,
  type RenderAPI,
} from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../__mocks__/@react-native-community/netinfo';
import { EXPLORE_TAB_INDEX } from '../../../../constants/navigation/exploreTabIndices';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { analytics } from '../../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { getRouteParamsProbeTestId } from '../../../../../tests/component-view/render';
import {
  expectPredictNextGameCard,
  makePredictNextGameEvent,
  messengerCall,
  mockPredictNextMessenger,
  nflEvents,
  publishPredictNextGameLiveUpdate,
  PREDICT_NEXT_FEED_IDS,
  configurePredictNextCatalog,
  resetPredictNextCatalog,
} from '../../../../../tests/component-view/fixtures/predictNext';
import { KALSHI_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
import type { PredictConfig } from '../config/predictConfig';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';
import { PredictNextRoutes } from '../navigation/routes';
import type { PredictEvent, PredictTimestamp, PredictVenueId } from '../types';
import { PredictHomeTestIds } from '../views/PredictHome/PredictHome.testIds';
import { PredictOrderFlowTestIds } from '../views/PredictOrderFlow/internal/PredictOrderFlow.testIds';
import { PredictTrendingTestIds } from './PredictTrending.testIds';

const LEGACY_LANE: PredictConfig = {
  enabled: false,
  venues: {
    polymarket: { enabled: false },
    kalshi: { enabled: false },
  },
  venueSelection: { enabled: false },
};

/** Both Venues rolled out, so a Venue Selection Preference decides. */
const BOTH_VENUES: PredictConfig = {
  enabled: true,
  venues: {
    polymarket: { enabled: true },
    kalshi: { enabled: true },
  },
  venueSelection: { enabled: true },
};

const SPORTS_TAB = `explore-tabs-bar-tab-${EXPLORE_TAB_INDEX.SPORTS}`;
const PREDICT_SECTION_TITLE = strings('wallet.predict');
const SPORTS_PREDICTIONS_TITLE = strings('trending.predictions');
const ALL_SPORTS_TITLE = strings('trending.all_sports');

const EXPLORE_INTERACTED = MetaMetricsEvents.EXPLORE_INTERACTED.category;
const EXPLORE_SEARCH_INTERACTED =
  MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category;
const GET_FEED = 'PredictMarketDataService:getFeed';
const SEARCH_EVENTS = 'PredictMarketDataService:searchEvents';
const INVALIDATE = 'PredictMarketDataService:invalidateQueries';
const WATCH_EVENTS = 'PredictLiveDataService:watchEvents';
const GAME_LIVE_UPDATED = 'PredictLiveDataService:gameLiveUpdated';
const QUOTE_UPDATED = 'PredictLiveDataService:quoteUpdated';
/** Kalshi's `sports` Feed key maps to its NFL Games Feed. */
const KALSHI_SPORTS_FEED = PREDICT_NEXT_FEED_IDS.nflGames;
const [NFL_1] = nflEvents;

const renderExplore = ({
  predictConfig,
  venueSelectionPreference = null,
}: {
  predictConfig: PredictConfig;
  venueSelectionPreference?: PredictVenueControllerState['venueSelectionPreference'];
}) =>
  renderTrendingViewWithRoutes({
    overrides: {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              predictTradingEnabled: {
                enabled: true,
                featureVersion: '1.0.0',
                minimumVersion: '0.0.1',
              },
              predictConfig,
            },
          },
          PredictController: {
            balances: {},
            pendingDeposits: {},
            claimablePositions: {},
            accountMeta: {},
            activeBuyOrders: {},
            withdrawTransaction: null,
          },
          PredictVenueController: {
            venueSelectionPreference,
            lastActiveVenue: null,
            sessionDefault: null,
          },
        },
      },
    } as never,
  });

const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;
const getMarkets = Engine.context.PredictController.getMarkets as jest.Mock;
const searchMarkets = Engine.context.PredictController
  .searchMarkets as jest.Mock;

/** Publishes a new Venue Selection Preference to Redux, as the Engine does. */
const selectVenue = (
  view: ReturnType<typeof renderExplore>,
  venue: 'polymarket' | 'kalshi',
) => {
  act(() => {
    engine.state = {
      ...engine.state,
      PredictVenueController: {
        ...view.store.getState().engine.backgroundState.PredictVenueController,
        venueSelectionPreference: venue,
      },
    };
    view.store.dispatch(updateBgState({ key: 'PredictVenueController' }));
  });
};

const baseMessengerCall = messengerCall.getMockImplementation();

/** What the Kalshi data services answer, read at call time. */
let kalshiFeed: readonly PredictEvent[] | Error = nflEvents;
let kalshiSearch: readonly PredictEvent[] | Error = nflEvents;

const answer = (result: readonly PredictEvent[] | Error, body: object) =>
  result instanceof Error ? Promise.reject(result) : Promise.resolve(body);

/** Serves the Kalshi catalog, Feed and search through the Engine messenger. */
const serveKalshi = () =>
  mockPredictNextMessenger((action: string, ...params: never[]) => {
    const [venueId, feedId] = params as unknown as string[];
    if (action === GET_FEED) {
      return answer(kalshiFeed, {
        venueId,
        id: feedId,
        title: 'NFL Games',
        events: kalshiFeed,
      });
    }
    if (action === SEARCH_EVENTS) {
      return answer(kalshiSearch, { venueId, events: kalshiSearch });
    }
    if (action.startsWith('PredictMarketDataService:')) {
      return Promise.resolve(undefined);
    }
    return baseMessengerCall?.(action, ...params);
  });

const callsTo = (action: string) =>
  messengerCall.mock.calls.filter(([name]) => name === action);

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;
const messengerSubscribe = Engine.controllerMessenger
  .subscribe as unknown as jest.Mock;
const messengerUnsubscribe = Engine.controllerMessenger
  .unsubscribe as unknown as jest.Mock;

/** Listeners registered on a live-data topic and not yet released. */
const heldListeners = (topic: string) =>
  messengerSubscribe.mock.calls.filter(([name]) => name === topic).length -
  messengerUnsubscribe.mock.calls.filter(([name]) => name === topic).length;

const trackedProperties = (spy: jest.SpyInstance, eventName: string) =>
  spy.mock.calls
    .map(([event]) => event as { name: string; properties: object })
    .filter((event) => event.name === eventName)
    .map((event) => event.properties);

const actButtonPress = async (
  button: Parameters<typeof userEvent.press>[0],
) => {
  try {
    await userEvent.press(button);
  } catch {
    act(() => fireEvent.press(button));
  }
};

const openSportsTab = async (getByTestId: RenderAPI['getByTestId']) => {
  await waitFor(() => expect(getByTestId(SPORTS_TAB)).toBeOnTheScreen());
  await actButtonPress(getByTestId(SPORTS_TAB));
};

const renderKalshiExplore = () =>
  renderExplore({
    predictConfig: BOTH_VENUES,
    venueSelectionPreference: 'kalshi',
  });

/** Opens the Sports tab and waits for Kalshi's first card. */
const openKalshiSports = async (view: ReturnType<typeof renderExplore>) => {
  await openSportsTab(view.getByTestId);
  return view.findByTestId(PredictHomeTestIds.event('kalshi', NFL_1.id));
};

const pullToRefreshSports = (
  view: ReturnType<typeof renderExplore>,
  sportKey: string,
) =>
  act(() => {
    view
      .getByTestId(TrendingViewSelectorsIDs.exploreSportsList(sportKey))
      .props.refreshControl.props.onRefresh();
  });

const searchExplore = async (
  view: ReturnType<typeof renderExplore>,
  query: string,
) => {
  await waitFor(() =>
    expect(
      view.getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
    ).toBeOnTheScreen(),
  );
  await actButtonPress(
    view.getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
  );
  const input = await view.findByTestId(
    TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
  );
  await userEvent.type(input, query);
};

const predictRouteParams = async (view: ReturnType<typeof renderExplore>) =>
  JSON.parse(
    (await view.findByTestId(getRouteParamsProbeTestId(Routes.PREDICT.ROOT)))
      .props.children,
  );

describeForPlatforms('Explore prediction sections', () => {
  let trackEvent: jest.SpyInstance;

  beforeEach(() => {
    kalshiFeed = nflEvents;
    kalshiSearch = nflEvents;
    messengerCall.mockClear();
    serveKalshi();
    trackEvent = jest.spyOn(analytics, 'trackEvent');
    setupTrendingApiFetchMock(mockTrendingTokensData);
    getMarkets.mockClear();
    searchMarkets.mockClear();
    getMarkets.mockResolvedValue({
      markets: [MOCK_PREDICT_MARKET],
      nextCursor: null,
    });
  });

  afterEach(() => {
    engine.state = originalEngineState;
    clearTrendingApiMocks();
    netInfoMock.__resetMockNetInfo();
    messengerCall.mockImplementation(baseMessengerCall);
    resetPredictNextCatalog();
    trackEvent.mockRestore();
  });

  describe('on the legacy lane (Polymarket)', () => {
    it('shows the Now tab Predict carousel with the trending market', async () => {
      const { findByText } = renderExplore({ predictConfig: LEGACY_LANE });

      expect(await findByText(PREDICT_SECTION_TITLE)).toBeOnTheScreen();
      expect(await findByText(MOCK_PREDICT_MARKET.title)).toBeOnTheScreen();
      expect(getMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'trending' }),
      );
    });

    it('shows the Sports tab All Sports list and reads soccer markets', async () => {
      const { findByText, getByTestId } = renderExplore({
        predictConfig: LEGACY_LANE,
      });

      await openSportsTab(getByTestId);

      expect(await findByText(ALL_SPORTS_TITLE)).toBeOnTheScreen();
      expect(getMarkets).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'sports',
          customQueryParams: 'tag_id=100350',
        }),
      );
    });
  });

  describe('while a next Venue (Kalshi) is active', () => {
    it("shows the Sports tab Predictions carousel from Kalshi's sports Feed, without All Sports", async () => {
      const view = renderKalshiExplore();

      await openKalshiSports(view);

      expect(view.getByText(SPORTS_PREDICTIONS_TITLE)).toBeOnTheScreen();
      expectPredictNextGameCard(
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
        'nfl-1',
        {
          away: 'Packers',
          home: 'Steelers',
          awayScore: '17',
          homeScore: '21',
          awayQuote: 'PAC · 41¢',
          homeQuote: 'STE · 59¢',
        },
      );
      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-2')),
      ).toBeOnTheScreen();
      expect(view.queryByText(ALL_SPORTS_TITLE)).not.toBeOnTheScreen();
      expect(
        view.queryByText(strings('trending.all_sports_no_markets')),
      ).not.toBeOnTheScreen();
      expect(callsTo(GET_FEED)).toEqual([
        [GET_FEED, 'kalshi', KALSHI_SPORTS_FEED, { limit: 6 }],
      ]);
      expect(getMarkets).not.toHaveBeenCalled();
    });

    it('omits the Predictions section on every tab whose Feed key Kalshi lacks', async () => {
      const view = renderKalshiExplore();

      // Every tab stays mounted; only the Sports tab's section reads a Feed.
      await openKalshiSports(view);
      await actButtonPress(
        view.getByTestId(`explore-tabs-bar-tab-${EXPLORE_TAB_INDEX.NOW}`),
      );

      expect(
        view.getByTestId(TrendingViewSelectorsIDs.EXPLORE_NOW_SCROLL_VIEW),
      ).toBeOnTheScreen();
      expect(view.queryByText(PREDICT_SECTION_TITLE)).not.toBeOnTheScreen();
      expect(callsTo(GET_FEED).map(([, , feedId]) => feedId)).toEqual([
        KALSHI_SPORTS_FEED,
      ]);
      expect(getMarkets).not.toHaveBeenCalled();
    });

    it('opens the Event through an intent when a card is pressed, and tracks the tap', async () => {
      const view = renderKalshiExplore();
      await openKalshiSports(view);
      trackEvent.mockClear();

      fireEvent.press(
        view.getByTestId(PredictHomeTestIds.eventContent('kalshi', NFL_1.id)),
      );

      expect(await predictRouteParams(view)).toEqual({
        screen: PredictNextRoutes.EVENT,
        params: {
          venueId: 'kalshi',
          eventId: NFL_1.id,
          titleSnapshot: NFL_1.title,
        },
      });
      expect(trackedProperties(trackEvent, EXPLORE_INTERACTED)).toEqual([
        {
          interaction_type: 'section_item_tapped',
          tab_name: 'Sports',
          section_name: 'predictions_sports',
          asset_type: 'prediction',
          position: 0,
          item_clicked: NFL_1.id,
        },
      ]);
    });

    it('opens the PredictNext Order Flow from a buy button without navigating, and tracks the vote', async () => {
      const view = renderKalshiExplore();
      const card = await openKalshiSports(view);
      trackEvent.mockClear();

      fireEvent.press(
        within(card).getByTestId(
          PredictHomeTestIds.gameQuote(NFL_1.id, 'away'),
        ),
      );

      expect(
        await view.findByTestId(PredictOrderFlowTestIds.SHEET),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(getRouteParamsProbeTestId(Routes.PREDICT.ROOT)),
      ).not.toBeOnTheScreen();
      expect(trackedProperties(trackEvent, EXPLORE_INTERACTED)).toEqual([
        {
          interaction_type: 'prediction_voted',
          tab_name: 'Sports',
          section_name: 'predictions_sports',
          item_clicked: NFL_1.id,
        },
      ]);
    });

    it('watches the six carousel games with one listener per topic and one watch, and patches each card', async () => {
      const games = Array.from({ length: 6 }, (_, index) =>
        makePredictNextGameEvent(
          `nfl-live-${index + 1}`,
          `Away ${index + 1}`,
          `Home ${index + 1}`,
          'NFL',
        ),
      );
      kalshiFeed = games;
      // The shared NetInfo mock reports offline, which turns live data off.
      netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
      messengerSubscribe.mockClear();
      messengerUnsubscribe.mockClear();
      const view = renderKalshiExplore();

      await openSportsTab(view.getByTestId);
      await view.findByTestId(PredictHomeTestIds.event('kalshi', games[0].id));

      await waitFor(() =>
        expect(callsTo(WATCH_EVENTS)).toEqual([
          [
            WATCH_EVENTS,
            'kalshi',
            games.map((game) => game.id),
            { marketScope: 'card' },
          ],
        ]),
      );
      expect(heldListeners(GAME_LIVE_UPDATED)).toBe(1);
      expect(heldListeners(QUOTE_UPDATED)).toBe(1);

      act(() => {
        publishPredictNextGameLiveUpdate({
          venueId: 'kalshi' as PredictVenueId,
          eventId: games[0].id,
          type: 'football_game',
          status: 'in_progress',
          score: { away: '28', home: '24' },
          period: 'Q4',
          clock: '01:12',
          observedAt: '2026-09-11T03:00:00.000Z' as PredictTimestamp,
        });
      });

      const card = within(
        view.getByTestId(PredictHomeTestIds.event('kalshi', games[0].id)),
      );
      expect(card.getByText('28')).toBeOnTheScreen();
      expect(card.getByText('Q4 · 01:12')).toBeOnTheScreen();
    });

    it('omits the Sports Predictions section when the Feed is empty', async () => {
      kalshiFeed = [];
      const view = renderKalshiExplore();

      await openSportsTab(view.getByTestId);
      await waitFor(() => expect(callsTo(GET_FEED)).toHaveLength(1));

      // The header shows with its skeleton while the Feed loads, then goes.
      await waitFor(() =>
        expect(
          view.queryByText(SPORTS_PREDICTIONS_TITLE),
        ).not.toBeOnTheScreen(),
      );
      expect(
        view.queryByTestId(PredictHomeTestIds.event('kalshi', NFL_1.id)),
      ).not.toBeOnTheScreen();
      expect(view.queryByText(ALL_SPORTS_TITLE)).not.toBeOnTheScreen();
    });

    it('omits the section when the Feed fails, and recovers on pull-to-refresh', async () => {
      kalshiFeed = new Error('Feed unavailable');
      const view = renderKalshiExplore();
      await openSportsTab(view.getByTestId);
      await waitFor(() => expect(callsTo(GET_FEED)).toHaveLength(1));
      await waitFor(() =>
        expect(
          view.queryByText(SPORTS_PREDICTIONS_TITLE),
        ).not.toBeOnTheScreen(),
      );

      kalshiFeed = nflEvents;
      pullToRefreshSports(view, '');

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', NFL_1.id)),
      ).toBeOnTheScreen();
      expect(view.getByText(SPORTS_PREDICTIONS_TITLE)).toBeOnTheScreen();
      expect(callsTo(GET_FEED)).toHaveLength(2);
    });

    it('re-reads the Feed through the data service on pull-to-refresh and keeps the cards', async () => {
      const view = renderKalshiExplore();
      await openKalshiSports(view);

      pullToRefreshSports(view, '');

      await waitFor(() => expect(callsTo(GET_FEED)).toHaveLength(2));
      expect(callsTo(INVALIDATE)).toEqual([
        [
          INVALIDATE,
          {
            queryKey: [GET_FEED, 'kalshi', KALSHI_SPORTS_FEED, { limit: 6 }],
            exact: true,
          },
          undefined,
        ],
      ]);
      expect(
        view.getByTestId(PredictHomeTestIds.event('kalshi', NFL_1.id)),
      ).toBeOnTheScreen();
    });

    it('swaps Kalshi cards for the Polymarket lane on a Venue switch, then back with one read', async () => {
      const view = renderKalshiExplore();
      await openKalshiSports(view);

      selectVenue(view, 'polymarket');

      expect(await view.findByText(ALL_SPORTS_TITLE)).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.event('kalshi', NFL_1.id)),
      ).not.toBeOnTheScreen();
      pullToRefreshSports(view, 'soccer');
      const kalshiReads = callsTo(GET_FEED).length;

      selectVenue(view, 'kalshi');

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', NFL_1.id)),
      ).toBeOnTheScreen();
      expect(view.queryByText(ALL_SPORTS_TITLE)).not.toBeOnTheScreen();
      await act(async () => {
        await Promise.resolve();
      });
      expect(callsTo(GET_FEED).length - kalshiReads).toBeLessThanOrEqual(1);
      expect(callsTo(INVALIDATE)).toEqual([]);
    });

    it("searches Kalshi through the Predictions pill and shows each Event's favourite", async () => {
      const view = renderKalshiExplore();

      await searchExplore(view, 'packers');
      await actButtonPress(
        await view.findByTestId(
          ExploreSearchScreenSelectorsIDs.PILL_PREDICTIONS,
        ),
      );

      const row = await view.findByTestId(
        PredictTrendingTestIds.searchRow(NFL_1.id),
      );
      const chance = strings('predict_next.trending.search_row_chance', {
        probability: '59%',
        outcome: 'Steelers',
      });
      expect(within(row).getByText(NFL_1.title)).toBeOnTheScreen();
      expect(within(row).getByText(chance)).toBeOnTheScreen();
      expect(
        view.getByRole('button', { name: `${NFL_1.title}, ${chance}` }),
      ).toBe(row);
      expect(
        view.getByTestId(PredictTrendingTestIds.searchRow('nfl-2')),
      ).toBeOnTheScreen();
      expect(callsTo(SEARCH_EVENTS)).toEqual(
        expect.arrayContaining([
          [SEARCH_EVENTS, 'kalshi', { q: 'packers', limit: 20 }],
        ]),
      );
      expect(searchMarkets).not.toHaveBeenCalled();
    });

    it('opens a search result through an intent and tracks its identity', async () => {
      const view = renderKalshiExplore();
      await searchExplore(view, 'packers');

      const row = await view.findByTestId(
        PredictTrendingTestIds.searchRow(NFL_1.id),
      );

      // A tap: Explore tracks the touch, the row opens the Event.
      fireEvent(row, 'touchStart', { nativeEvent: { pageY: 0 } });
      fireEvent(row, 'touchEnd');
      fireEvent.press(row);

      expect((await predictRouteParams(view)).params).toEqual({
        venueId: 'kalshi',
        eventId: NFL_1.id,
        titleSnapshot: NFL_1.title,
      });
      expect(
        trackedProperties(trackEvent, EXPLORE_SEARCH_INTERACTED),
      ).toContainEqual(
        expect.objectContaining({
          interaction_type: 'result_clicked',
          item_clicked: NFL_1.id,
          market_id: NFL_1.id,
          market_title: NFL_1.title,
        }),
      );
    });

    it('shows the Predictions empty state when Kalshi search finds nothing', async () => {
      kalshiSearch = [];
      const view = renderKalshiExplore();
      await searchExplore(view, 'zzz');

      await actButtonPress(
        await view.findByTestId(
          ExploreSearchScreenSelectorsIDs.PILL_PREDICTIONS,
        ),
      );

      expect(
        await view.findByText(
          strings('trending.no_results_for_feed', {
            feedName: strings('trending.search_tabs.predictions'),
            query: 'zzz',
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictTrendingTestIds.searchRow(NFL_1.id)),
      ).not.toBeOnTheScreen();
    });

    it('offers no Predictions search pill when the descriptor does not support search', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        searchSupported: false,
      });
      const view = renderKalshiExplore();

      await searchExplore(view, 'packers');

      expect(
        await view.findByTestId(ExploreSearchScreenSelectorsIDs.PILL_CRYPTOS),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(ExploreSearchScreenSelectorsIDs.PILL_PREDICTIONS),
      ).not.toBeOnTheScreen();
      expect(callsTo(SEARCH_EVENTS)).toEqual([]);
      expect(searchMarkets).not.toHaveBeenCalled();
    });
  });
});
