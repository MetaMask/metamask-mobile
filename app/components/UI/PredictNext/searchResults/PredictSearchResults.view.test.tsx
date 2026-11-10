import '../../../../../tests/component-view/mocks';
import type { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../__mocks__/@react-native-community/netinfo';
import {
  PREDICT_ROOT_PARAMS_PROBE,
  renderUrlAutocompleteWithRoutes,
  URL_AUTOCOMPLETE_QUERY_INPUT,
} from '../../../../../tests/component-view/renderers/urlAutocomplete';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { createComponentViewQueryClient } from '../../../../../tests/component-view/render';
import {
  clearTrendingApiMocks,
  mockTrendingTokensData,
  setupTrendingApiFetchMock,
} from '../../../../../tests/component-view/api-mocking/trending';
import {
  MOCK_PREDICT_CLOSED_MARKET,
  MOCK_PREDICT_MARKET,
} from '../../../../../tests/component-view/fixtures/predict';
import {
  configurePredictNextCatalog,
  messengerCall,
  mockPredictNextMessenger,
  nflEvents,
  resetPredictNextCatalog,
} from '../../../../../tests/component-view/fixtures/predictNext';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { KALSHI_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';
import { SEARCH_RESULT_LIMIT } from '../hooks/useSearchEvents';
import { PredictNextRoutes } from '../navigation/routes';
import { marketDataQueries } from '../queries/marketDataQueries';
import type { PredictEvent, PredictVenueId } from '../types';
import { UrlAutocompleteCategory } from '../../UrlAutocomplete/types';
import {
  SECTION_LOADING_INDICATOR_TEST_ID,
  sectionHeaderTestId,
} from '../../UrlAutocomplete/UrlAutocomplete.testIds';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import type { PredictConfig } from '../config/predictConfig';
import {
  getPredictSearchResultRowTestId,
  PredictSearchResultRowTestIds,
} from './PredictSearchResultRow.testIds';

const LEGACY_LANE: PredictConfig = {
  enabled: false,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: false } },
  venueSelection: { enabled: false },
};

const KALSHI_ONLY: PredictConfig = {
  enabled: true,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};

/** Both Venues rolled out, so the Venue Selection Preference decides. */
const BOTH_VENUES: PredictConfig = {
  enabled: true,
  venues: { polymarket: { enabled: true }, kalshi: { enabled: true } },
  venueSelection: { enabled: true },
};

const PREDICTIONS_HEADER = strings('autocomplete.predictions');
const HIDDEN = { includeHiddenElements: true };

const IMAGED_MARKET = {
  ...MOCK_PREDICT_MARKET,
  image: 'https://example.com/btc.png',
};

const searchMarkets = Engine.context.PredictController
  .searchMarkets as jest.Mock;

const renderAutocomplete = (
  predictConfig: PredictConfig,
  venueSelectionPreference: PredictVenueControllerState['venueSelectionPreference'] = null,
  queryClient?: QueryClient,
) =>
  renderUrlAutocompleteWithRoutes({
    queryClient,
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

describeForPlatforms('Browser URL autocomplete predictions', () => {
  beforeEach(() => {
    setupTrendingApiFetchMock(
      mockTrendingTokensData,
      undefined,
      undefined,
      bitcoinSearchResults,
    );
    searchMarkets.mockReset();
    searchMarkets.mockResolvedValue({
      markets: [IMAGED_MARKET, MOCK_PREDICT_CLOSED_MARKET],
      totalResults: 2,
    });
  });

  afterEach(() => {
    clearTrendingApiMocks();
  });

  it('shows every Polymarket search result, in order, from one search', async () => {
    const view = renderAutocomplete(LEGACY_LANE);

    fireEvent.changeText(
      view.getByTestId(URL_AUTOCOMPLETE_QUERY_INPUT),
      'bitcoin',
    );

    await waitFor(() => {
      expect(
        view.getByTestId(
          getPredictSearchResultRowTestId(IMAGED_MARKET.id),
          HIDDEN,
        ),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(
          getPredictSearchResultRowTestId(MOCK_PREDICT_CLOSED_MARKET.id),
          HIDDEN,
        ),
      ).toBeOnTheScreen();
    });

    // Re-query after the wait: the list re-keys a row whenever a section above
    // Predictions settles, so a node found before that settles is unmounted by
    // the time it is used.
    const openRow = view.getByTestId(
      getPredictSearchResultRowTestId(IMAGED_MARKET.id),
      HIDDEN,
    );
    const closedRow = view.getByTestId(
      getPredictSearchResultRowTestId(MOCK_PREDICT_CLOSED_MARKET.id),
      HIDDEN,
    );

    expect(view.getByText(PREDICTIONS_HEADER, HIDDEN)).toBeOnTheScreen();
    expect(
      within(openRow).getByText(IMAGED_MARKET.title, HIDDEN),
    ).toBeOnTheScreen();
    expect(within(openRow).getByText('Open', HIDDEN)).toBeOnTheScreen();
    expect(
      within(openRow).getByTestId(PredictSearchResultRowTestIds.IMAGE, HIDDEN),
    ).toHaveProp('source', { uri: IMAGED_MARKET.image });
    expect(
      within(closedRow).getByText(MOCK_PREDICT_CLOSED_MARKET.title, HIDDEN),
    ).toBeOnTheScreen();
    expect(within(closedRow).getByText('closed', HIDDEN)).toBeOnTheScreen();
    expect(
      within(closedRow).getByTestId(
        PredictSearchResultRowTestIds.PLACEHOLDER_ICON,
        HIDDEN,
      ),
    ).toBeOnTheScreen();
    const rowIds = view
      .getAllByTestId(/^predict-search-result-row-market/, HIDDEN)
      .map((row) => row.props.testID);
    expect(rowIds).toEqual([
      getPredictSearchResultRowTestId(IMAGED_MARKET.id),
      getPredictSearchResultRowTestId(MOCK_PREDICT_CLOSED_MARKET.id),
    ]);
    // Explore's search and Predict's source share one query.
    expect(searchMarkets).toHaveBeenCalledTimes(1);
    expect(searchMarkets).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'bitcoin' }),
    );
  });

  it('shows the Predictions header spinner while the Polymarket search is in flight', async () => {
    searchMarkets.mockImplementation(() => new Promise(() => undefined));
    const view = renderAutocomplete(LEGACY_LANE);

    fireEvent.changeText(
      view.getByTestId(URL_AUTOCOMPLETE_QUERY_INPUT),
      'bitcoin',
    );

    // Past the debounce: the spinner now stands for the request, not the typing
    await waitFor(() =>
      expect(searchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'bitcoin' }),
      ),
    );
    const header = view.getByTestId(
      sectionHeaderTestId(UrlAutocompleteCategory.Predictions),
      HIDDEN,
    );
    expect(
      within(header).getByText(PREDICTIONS_HEADER, HIDDEN),
    ).toBeOnTheScreen();
    expect(
      within(header).getByTestId(SECTION_LOADING_INDICATOR_TEST_ID, HIDDEN),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(/^predict-search-result-row-/, HIDDEN),
    ).not.toBeOnTheScreen();
  });

  it('opens the market details on a result press, as Browser did', async () => {
    const view = renderAutocomplete(LEGACY_LANE);
    fireEvent.changeText(
      view.getByTestId(URL_AUTOCOMPLETE_QUERY_INPUT),
      'bitcoin',
    );
    await waitFor(() =>
      expect(
        view.getByTestId(
          getPredictSearchResultRowTestId(IMAGED_MARKET.id),
          HIDDEN,
        ),
      ).toBeOnTheScreen(),
    );

    fireEvent.press(
      view.getByTestId(
        getPredictSearchResultRowTestId(IMAGED_MARKET.id),
        HIDDEN,
      ),
    );

    const params = await view.findByTestId(PREDICT_ROOT_PARAMS_PROBE);
    expect(JSON.parse(String(params.props.children))).toEqual({
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: IMAGED_MARKET.id,
        providerId: IMAGED_MARKET.providerId,
      },
    });
  });

  it('leaves Predictions out and reads no Polymarket market while Kalshi is active', async () => {
    const view = renderAutocomplete(KALSHI_ONLY);

    fireEvent.changeText(
      view.getByTestId(URL_AUTOCOMPLETE_QUERY_INPUT),
      'bitcoin',
    );

    // The token search for the query settles after the debounce, as a
    // Predict search would.
    const bitcoinToken = mockTrendingTokensData.find(
      ({ symbol }) => symbol === 'BTC',
    );
    expect(
      await view.findByText(String(bitcoinToken?.name), HIDDEN),
    ).toBeOnTheScreen();
    expect(view.queryByText(PREDICTIONS_HEADER, HIDDEN)).not.toBeOnTheScreen();
    expect(searchMarkets).not.toHaveBeenCalled();
  });
});

const SEARCH_EVENTS = 'PredictMarketDataService:searchEvents';
const [NFL_1, NFL_2] = nflEvents;
const IMAGED_NFL_1: PredictEvent = {
  ...NFL_1,
  imageUrl: 'https://example.com/packers.png' as PredictEvent['imageUrl'],
};
const CLOSED_NFL_2: PredictEvent = {
  ...NFL_2,
  markets: NFL_2.markets.map((market) => ({ ...market, status: 'closed' })),
};

const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;
const baseMessengerCall = messengerCall.getMockImplementation();
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const searchCalls = () =>
  messengerCall.mock.calls.filter(([name]) => name === SEARCH_EVENTS);

/** Publishes a new Venue Selection Preference to Redux, as the Engine does. */
const selectVenue = (
  view: ReturnType<typeof renderAutocomplete>,
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

const typeQuery = (view: ReturnType<typeof renderAutocomplete>, q: string) =>
  fireEvent.changeText(view.getByTestId(URL_AUTOCOMPLETE_QUERY_INPUT), q);

/** Waits until the tokens section shows the query's results: the debounce
 * has passed, as it has for Predict's search. */
const waitForTokenSearch = async (
  view: ReturnType<typeof renderAutocomplete>,
) => {
  const bitcoinToken = mockTrendingTokensData.find(
    ({ symbol }) => symbol === 'BTC',
  );
  await view.findByText(String(bitcoinToken?.name), HIDDEN);
};

/** The mocked token search answers with the trending fixture's BTC row. */
const bitcoinSearchResults = mockTrendingTokensData.filter(
  ({ symbol }) => symbol === 'BTC',
);

describeForPlatforms('Browser URL autocomplete predictions on Kalshi', () => {
  /** What Kalshi search answers, read at call time. */
  let kalshiSearch: () => Promise<unknown>;

  beforeEach(() => {
    setupTrendingApiFetchMock(
      mockTrendingTokensData,
      undefined,
      undefined,
      bitcoinSearchResults,
    );
    // Online, so nothing gated on the network tier is silently off.
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    searchMarkets.mockReset();
    searchMarkets.mockResolvedValue({
      markets: [IMAGED_MARKET],
      totalResults: 1,
    });
    messengerCall.mockClear();
    kalshiSearch = () =>
      Promise.resolve({
        venueId: 'kalshi',
        events: [IMAGED_NFL_1, CLOSED_NFL_2],
      });
    mockPredictNextMessenger((action: string, ...params: never[]) => {
      if (action === SEARCH_EVENTS) return kalshiSearch();
      if (action.startsWith('PredictMarketDataService:')) {
        return Promise.resolve(undefined);
      }
      return baseMessengerCall?.(action, ...params);
    });
  });

  afterEach(() => {
    engine.state = originalEngineState;
    clearTrendingApiMocks();
    netInfoMock.__resetMockNetInfo();
    messengerCall.mockImplementation(baseMessengerCall);
    resetPredictNextCatalog();
  });

  it("shows Kalshi's search results as Polymarket rows, from one useSearchEvents read", async () => {
    const view = renderAutocomplete(KALSHI_ONLY);

    typeQuery(view, ' packers ');

    const openRow = await view.findByTestId(
      getPredictSearchResultRowTestId(NFL_1.id),
      HIDDEN,
    );
    const closedRow = view.getByTestId(
      getPredictSearchResultRowTestId(NFL_2.id),
      HIDDEN,
    );
    expect(view.getByText(PREDICTIONS_HEADER, HIDDEN)).toBeOnTheScreen();
    expect(within(openRow).getByText(NFL_1.title, HIDDEN)).toBeOnTheScreen();
    expect(within(openRow).getByText('Open', HIDDEN)).toBeOnTheScreen();
    expect(
      within(openRow).getByTestId(PredictSearchResultRowTestIds.IMAGE, HIDDEN),
    ).toHaveProp('source', { uri: IMAGED_NFL_1.imageUrl });
    expect(within(closedRow).getByText(NFL_2.title, HIDDEN)).toBeOnTheScreen();
    expect(within(closedRow).getByText('closed', HIDDEN)).toBeOnTheScreen();
    expect(
      within(closedRow).getByTestId(
        PredictSearchResultRowTestIds.PLACEHOLDER_ICON,
        HIDDEN,
      ),
    ).toBeOnTheScreen();
    expect(searchCalls()).toEqual([
      [SEARCH_EVENTS, 'kalshi', { q: 'packers', limit: 20 }],
    ]);
    expect(searchMarkets).not.toHaveBeenCalled();
  });

  it('opens the Kalshi Event on a result press', async () => {
    const view = renderAutocomplete(KALSHI_ONLY);
    typeQuery(view, 'packers');
    const row = await view.findByTestId(
      getPredictSearchResultRowTestId(NFL_1.id),
      HIDDEN,
    );

    fireEvent.press(row);

    const params = await view.findByTestId(PREDICT_ROOT_PARAMS_PROBE);
    expect(JSON.parse(String(params.props.children))).toEqual({
      screen: PredictNextRoutes.EVENT,
      params: {
        venueId: 'kalshi',
        eventId: NFL_1.id,
        titleSnapshot: NFL_1.title,
      },
    });
  });

  it('shows the Predictions header spinner while Kalshi search is in flight', async () => {
    kalshiSearch = () => new Promise(() => undefined);
    const view = renderAutocomplete(KALSHI_ONLY);

    typeQuery(view, 'packers');

    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    const header = view.getByTestId(
      sectionHeaderTestId(UrlAutocompleteCategory.Predictions),
      HIDDEN,
    );
    expect(
      within(header).getByTestId(SECTION_LOADING_INDICATOR_TEST_ID, HIDDEN),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(/^predict-search-result-row-/, HIDDEN),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ['finds nothing', () => Promise.resolve({ venueId: 'kalshi', events: [] })],
    ['fails', () => Promise.reject(new Error('search failed'))],
  ])('leaves Predictions out when Kalshi search %s', async (_, answer) => {
    kalshiSearch = answer;
    const view = renderAutocomplete(KALSHI_ONLY);

    typeQuery(view, 'bitcoin');

    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    await waitForTokenSearch(view);
    await waitFor(() =>
      expect(
        view.queryByText(PREDICTIONS_HEADER, HIDDEN),
      ).not.toBeOnTheScreen(),
    );
    expect(
      view.queryByTestId(/^predict-search-result-row-/, HIDDEN),
    ).not.toBeOnTheScreen();
  });

  it('renders no Predictions section, not even a spinner, when the descriptor does not support search', async () => {
    configurePredictNextCatalog({
      ...KALSHI_STATIC_VENUE_CATALOG,
      searchSupported: false,
    });
    const view = renderAutocomplete(KALSHI_ONLY);

    typeQuery(view, 'bitcoin');

    // Wait for the catalog, so "no section" is the descriptor's answer and
    // not the catalog still loading.
    await waitFor(() =>
      expect(
        messengerCall.mock.calls.some(
          ([name]) => name === 'PredictMarketDataService:getVenueCatalog',
        ),
      ).toBe(true),
    );
    await waitForTokenSearch(view);
    expect(
      view.queryByTestId(
        sectionHeaderTestId(UrlAutocompleteCategory.Predictions),
        HIDDEN,
      ),
    ).not.toBeOnTheScreen();
    expect(searchCalls()).toEqual([]);
    expect(searchMarkets).not.toHaveBeenCalled();
  });

  it('never shows a Kalshi answer that arrives after the Venue changed to Polymarket', async () => {
    const queryClient = createComponentViewQueryClient();
    const view = renderAutocomplete(BOTH_VENUES, 'kalshi', queryClient);
    // Warm the catalog and the search: Kalshi answers a first query.
    typeQuery(view, 'packers');
    await view.findByTestId(getPredictSearchResultRowTestId(NFL_1.id), HIDDEN);

    // A second Kalshi search is in flight when the Venue changes.
    let answerLate: (value: unknown) => void = () => undefined;
    kalshiSearch = () =>
      new Promise((resolve) => {
        answerLate = resolve;
      });
    typeQuery(view, 'bitcoin');
    await waitFor(() => expect(searchCalls()).toHaveLength(2));
    selectVenue(view, 'polymarket');
    const polymarketRow = await view.findByTestId(
      getPredictSearchResultRowTestId(IMAGED_MARKET.id),
      HIDDEN,
    );

    // The late answer reaches the query cache under Kalshi's key...
    const lateQueryKey = marketDataQueries.searchEvents(
      'kalshi' as PredictVenueId,
      {
        q: 'bitcoin',
        limit: SEARCH_RESULT_LIMIT,
      },
    ).queryKey;
    act(() => {
      answerLate({ venueId: 'kalshi', events: [IMAGED_NFL_1] });
    });
    await waitFor(() =>
      expect(queryClient.getQueryState(lateQueryKey)?.status).toBe('success'),
    );
    // ...and one zero-delay flush lets any observer of that key re-render.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(polymarketRow).toBeOnTheScreen();
    expect(
      view.queryByTestId(getPredictSearchResultRowTestId(NFL_1.id), HIDDEN),
    ).not.toBeOnTheScreen();
    queryClient.clear();
  });

  it('replaces the Polymarket rows with Kalshi ones when the Venue changes to Kalshi', async () => {
    const view = renderAutocomplete(BOTH_VENUES, 'polymarket');
    typeQuery(view, 'packers');
    await view.findByTestId(
      getPredictSearchResultRowTestId(IMAGED_MARKET.id),
      HIDDEN,
    );
    expect(searchCalls()).toEqual([]);

    selectVenue(view, 'kalshi');

    await view.findByTestId(getPredictSearchResultRowTestId(NFL_1.id), HIDDEN);
    expect(
      view.queryByTestId(
        getPredictSearchResultRowTestId(IMAGED_MARKET.id),
        HIDDEN,
      ),
    ).not.toBeOnTheScreen();
    expect(searchCalls()).toEqual([
      [SEARCH_EVENTS, 'kalshi', { q: 'packers', limit: 20 }],
    ]);
  });

  it('drops the Kalshi results on the render the Venue changes, without searching Kalshi again', async () => {
    searchMarkets.mockImplementation(() => new Promise(() => undefined));
    const view = renderAutocomplete(BOTH_VENUES, 'kalshi');
    typeQuery(view, 'packers');
    await view.findByTestId(getPredictSearchResultRowTestId(NFL_1.id), HIDDEN);

    selectVenue(view, 'polymarket');

    expect(
      view.queryByTestId(getPredictSearchResultRowTestId(NFL_1.id), HIDDEN),
    ).not.toBeOnTheScreen();
    expect(searchCalls()).toHaveLength(1);
  });
});
