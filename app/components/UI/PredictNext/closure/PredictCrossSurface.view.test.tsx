import '../../../../../tests/component-view/mocks';
// PRED-1394 (F1): the dual-stack closure journey.
//
// One person, one store, every wallet surface that shows Predict data:
//
//   wallet surfaces (Homepage section, BalanceBreakdown, Explore Sports,
//   Browser autocomplete, Predictions Activity)
//        | tap the Predictions balance row
//        v
//   Predict (the real root route) -- venue picker --> the other Venue
//        | back
//        v
//   wallet surfaces again: every one of them now shows the new Venue
//
// The journey starts on Polymarket, the production lane, and switches to
// Kalshi and back with the picker. At each stop it reads every surface and
// checks that they agree on one Venue, that the other Venue's data and the
// capabilities the Venue lacks are gone, and that Polymarket after the round
// trip is exactly what it was before it.
//
// Each Venue serves data no other Venue serves (`POLYMARKET` and `KALSHI`
// below), so a surface that kept reading the old Venue, or never switched,
// shows the wrong title and fails here.
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../__mocks__/@react-native-community/netinfo';
import {
  PREDICT_CROSS_SURFACE_QUERY_INPUT,
  renderPredictCrossSurface,
} from '../../../../../tests/component-view/renderers/predictCrossSurface';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  clearTrendingApiMocks,
  setupTrendingApiFetchMock,
} from '../../../../../tests/component-view/api-mocking/trending';
import { stubFetchPath } from '../../../../../tests/component-view/api-mocking/fetchStub';
import {
  ACTIVITY_CV_PREDICT_MARKET_TITLE,
  buildPredictBuyActivity,
} from '../../../../../tests/component-view/presets/activity';
import { MOCK_PREDICT_MARKET } from '../../../../../tests/component-view/fixtures/predict';
import {
  makePredictNextPosition,
  makePredictNextSummary,
  makePredictNextTrade,
  messengerCall,
  mockPredictNextMessenger,
  nflEvents,
  resetPredictNextCatalog,
} from '../../../../../tests/component-view/fixtures/predictNext';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { HomepageBalanceBreakdownTestIds } from '../../../Views/Homepage/components/HomepageBalanceBreakdown/HomepageBalanceBreakdown.testIds';
import { TrendingViewSelectorsIDs } from '../../../Views/TrendingView/TrendingView.testIds';
import {
  activityListRowPrimaryAmountTestId,
  activityListRowSubtitleTestId,
  activityListRowTitleTestId,
} from '../../../Views/ActivityList/ActivityList.testIds';
import {
  PredictMarketDetailsSelectorsIDs,
  PredictMarketListSelectorsIDs,
} from '../../Predict/Predict.testIds';
import {
  PredictPositionStatus,
  type PredictPosition as LegacyPredictPosition,
} from '../../Predict/types';
import type { PredictConfig } from '../config/predictConfig';
import type { PredictConfiguredVenue } from '../implementation';
import { PredictHomeTestIds } from '../views/PredictHome/PredictHome.testIds';
import { PredictEventScreenTestIds } from '../views/PredictEvent/PredictEventScreen.testIds';
import { PredictHomeSectionTestIds } from '../homeSection/PredictHomeSection.testIds';
import { getPredictSearchResultRowTestId } from '../searchResults/PredictSearchResultRow.testIds';
import { PredictVenueSelectorTestIds } from '../venueSelection/PredictVenueSelector.testIds';

/** Both Venues rolled out and the picker on: the launch configuration. */
const BOTH_VENUES: PredictConfig = {
  enabled: true,
  venues: { polymarket: { enabled: true }, kalshi: { enabled: true } },
  venueSelection: { enabled: true },
};

/** A non-US session: Polymarket is the regional default. */
const NON_US_SESSION = {
  sessionDefault: { venue: 'polymarket', source: 'geolocation' },
} as const;

const HIDDEN = { includeHiddenElements: true };
const SEARCH_QUERY = 'packers';
const [NFL_1] = nflEvents;

// ─── What each Venue serves ────────────────────────────────────────────────

const POLYMARKET_POSITION: LegacyPredictPosition = {
  amount: 10,
  avgPrice: 1,
  cashPnl: 4,
  claimable: false,
  currentValue: 24,
  endDate: '2026-12-01T00:00:00Z',
  icon: 'https://example.com/icon.png',
  id: 'france',
  initialValue: 20,
  marketId: 'market-france',
  outcome: 'Yes',
  outcomeId: 'outcome-france',
  outcomeIndex: 0,
  outcomeTokenId: 'token-france',
  percentPnl: 20,
  price: 1,
  providerId: 'polymarket',
  size: 10,
  status: PredictPositionStatus.OPEN,
  title: 'Will France win the 2026 FIFA World Cup?',
};

const POLYMARKET = {
  /** Homepage section row. */
  positionTitle: POLYMARKET_POSITION.title,
  /** BalanceBreakdown: $100 cash + $24 open position. */
  balanceUsd: 100,
  portfolioValue: '$124.00',
  /** Explore Sports carousel and Browser autocomplete. */
  marketTitle: MOCK_PREDICT_MARKET.title,
  /** Predictions Activity row. */
  activity: buildPredictBuyActivity(),
  activityTitle: ACTIVITY_CV_PREDICT_MARKET_TITLE,
};

/** The legacy Homepage section's row for {@link POLYMARKET_POSITION}; the
 * legacy row builds its test ID from the position id and has no constant. */
const LEGACY_POSITION_ROW = `predict-position-row-${POLYMARKET_POSITION.id}`;

const KALSHI_TRADE_ID = '0199e2b4-1f0d-7c55-8a10-6b7c8d9e0f1a';

const KALSHI = {
  /** Homepage section row (the position's Event title). */
  positionTitle: 'Lakers vs Celtics',
  /** BalanceBreakdown: the Portfolio Summary total, never a sum. */
  summary: makePredictNextSummary({ totalValue: '168.13' }),
  portfolioValue: '$168.13',
  /** Explore Sports carousel and Browser autocomplete. */
  event: NFL_1,
  /** Predictions Activity row. */
  trade: makePredictNextTrade({
    id: KALSHI_TRADE_ID,
    action: 'buy',
    amount: '28.28',
    realizedPnl: undefined,
  }),
};

// ─── Engine: both stacks answer, so only the Active Venue decides ──────────

const legacy = Engine.context.PredictController as unknown as Record<
  string,
  jest.Mock
>;
const baseMessengerCall = messengerCall.getMockImplementation();
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const serveBothVenues = () => {
  legacy.getPositions
    .mockReset()
    .mockImplementation(({ claimable } = {}) =>
      Promise.resolve(claimable ? [] : [POLYMARKET_POSITION]),
    );
  legacy.getBalance.mockReset().mockResolvedValue(POLYMARKET.balanceUsd);
  legacy.getMarkets
    .mockReset()
    .mockResolvedValue({ markets: [MOCK_PREDICT_MARKET], nextCursor: null });
  legacy.searchMarkets
    .mockReset()
    .mockResolvedValue({ markets: [MOCK_PREDICT_MARKET], totalResults: 1 });
  legacy.getActivity
    .mockReset()
    .mockResolvedValue({ activities: [POLYMARKET.activity] });

  mockPredictNextMessenger((action: string, ...params: never[]) => {
    const [venueId, resourceId] = params as unknown as string[];
    switch (action) {
      case 'PredictPortfolioService:getPositions':
        return Promise.resolve({
          venueId,
          positions: [makePredictNextPosition()],
        });
      case 'PredictPortfolioService:getPortfolioSummary':
        return Promise.resolve(KALSHI.summary);
      case 'PredictPortfolioService:getBalance':
        return Promise.resolve({
          venueId,
          currency: 'USD',
          available: '123.13',
        });
      case 'PredictPortfolioService:getActivity':
        return Promise.resolve({ venueId, activity: [KALSHI.trade] });
      case 'PredictMarketDataService:getFeed':
        return Promise.resolve({
          venueId,
          id: resourceId,
          title: 'NFL Games',
          events: [KALSHI.event],
        });
      case 'PredictMarketDataService:searchEvents':
        return Promise.resolve({ venueId, events: [KALSHI.event] });
      default:
        if (action.startsWith('Predict')) return Promise.resolve(undefined);
        return baseMessengerCall?.(action, ...params);
    }
  });
};

/** Which stack served reads: the evidence that the inactive one is idle. */
const kalshiReads = () =>
  messengerCall.mock.calls.filter(([action]) =>
    /^Predict(Portfolio|MarketData)Service:(get|search)(?!VenueCatalog)/.test(
      action as string,
    ),
  ).length;
const polymarketReads = () =>
  legacy.getPositions.mock.calls.length +
  legacy.getMarkets.mock.calls.length +
  legacy.searchMarkets.mock.calls.length +
  legacy.getActivity.mock.calls.length;

// ─── The journey's steps ───────────────────────────────────────────────────

type View = ReturnType<typeof renderPredictCrossSurface>;
const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;

/** Answers the picker as PredictVenueController does: store, then publish. */
const persistPickerChoices = (getView: () => View | undefined) => {
  const delegate = messengerCall.getMockImplementation();
  messengerCall.mockImplementation((action: string, ...params: unknown[]) => {
    const view = getView();
    if (
      action !== 'PredictVenueController:setVenueSelectionPreference' ||
      !view
    ) {
      return delegate?.(action, ...params);
    }
    engine.state = {
      ...engine.state,
      PredictVenueController: {
        ...view.store.getState().engine.backgroundState.PredictVenueController,
        venueSelectionPreference: params[0] as PredictConfiguredVenue,
      },
    };
    view.store.dispatch(updateBgState({ key: 'PredictVenueController' }));
    return undefined;
  });
};

const renderJourney = () => {
  const rendered: { view?: View } = {};
  persistPickerChoices(() => rendered.view);
  rendered.view = renderPredictCrossSurface({
    predictConfig: BOTH_VENUES,
    venueState: NON_US_SESSION,
  });
  return rendered.view;
};

/** Wallet → Predict: tap the Predictions balance row, as a person would. */
const openPredictFromBalance = async (view: View) => {
  fireEvent.press(
    await view.findByTestId(HomepageBalanceBreakdownTestIds.ROW('predict')),
  );
};

/** Inside Predict: pick a Venue, land on its home, and go back to the wallet. */
const switchVenueInPredict = async (
  view: View,
  venue: PredictConfiguredVenue,
) => {
  fireEvent.press(await view.findByTestId(PredictVenueSelectorTestIds.BUTTON));
  await view.findByTestId(PredictVenueSelectorTestIds.SHEET);
  await act(async () => {
    fireEvent.press(
      view.getByTestId(PredictVenueSelectorTestIds.option(venue)),
    );
  });
  const home =
    venue === 'kalshi'
      ? PredictHomeTestIds.HOME
      : PredictMarketListSelectorsIDs.CONTAINER;
  expect(await view.findByTestId(home)).toBeOnTheScreen();
  fireEvent.press(
    view.getByTestId(
      venue === 'kalshi'
        ? PredictHomeTestIds.BACK
        : PredictMarketListSelectorsIDs.BACK_BUTTON,
    ),
  );
};

/** Types the query into Browser's URL bar. */
const searchBrowser = (view: View) =>
  fireEvent.changeText(
    view.getByTestId(PREDICT_CROSS_SURFACE_QUERY_INPUT),
    SEARCH_QUERY,
  );

/**
 * What every surface shows for one Venue, read only after each surface's
 * own data has arrived.
 */
const readSurfaces = async (view: View, venue: PredictConfiguredVenue) => {
  const isKalshi = venue === 'kalshi';
  const own = isKalshi ? KALSHI : POLYMARKET;

  // Homepage Predictions section: the Venue's own position row.
  const positionRow = isKalshi
    ? await view.findByTestId(PredictHomeSectionTestIds.POSITION_ROW, HIDDEN)
    : await view.findByTestId(LEGACY_POSITION_ROW, HIDDEN);
  expect(
    within(positionRow).getByText(own.positionTitle, HIDDEN),
  ).toBeOnTheScreen();
  // BalanceBreakdown Predictions row.
  await waitFor(() =>
    expect(
      view.getByTestId(HomepageBalanceBreakdownTestIds.VALUE('predict')),
    ).toHaveTextContent(own.portfolioValue),
  );
  // Explore Sports tab carousel.
  const sportsCard = isKalshi
    ? await view.findByTestId(PredictHomeTestIds.event('kalshi', NFL_1.id))
    : (await view.findAllByText(POLYMARKET.marketTitle, HIDDEN))[0];
  // Browser URL autocomplete.
  searchBrowser(view);
  const searchRow = await view.findByTestId(
    getPredictSearchResultRowTestId(
      isKalshi ? NFL_1.id : MOCK_PREDICT_MARKET.id,
    ),
    HIDDEN,
  );
  // Predictions Activity.
  const activityRow = await view.findByTestId(
    activityListRowTitleTestId(
      isKalshi ? KALSHI_TRADE_ID : POLYMARKET.activity.id,
    ),
    HIDDEN,
  );

  return { sportsCard, searchRow, activityRow };
};

/** Nothing of `venue`'s data is anywhere on screen. */
const expectNoTraceOf = (view: View, venue: PredictConfiguredVenue) => {
  if (venue === 'kalshi') {
    expect(
      view.queryByTestId(PredictHomeSectionTestIds.POSITION_ROW, HIDDEN),
    ).toBeNull();
    expect(
      view.queryByTestId(PredictHomeTestIds.event('kalshi', NFL_1.id), HIDDEN),
    ).toBeNull();
    expect(
      view.queryByTestId(getPredictSearchResultRowTestId(NFL_1.id), HIDDEN),
    ).toBeNull();
    expect(
      view.queryByTestId(activityListRowTitleTestId(KALSHI_TRADE_ID), HIDDEN),
    ).toBeNull();
  } else {
    expect(view.queryByTestId(LEGACY_POSITION_ROW, HIDDEN)).toBeNull();
    expect(view.queryByText(POLYMARKET.marketTitle, HIDDEN)).toBeNull();
    expect(
      view.queryByTestId(
        getPredictSearchResultRowTestId(MOCK_PREDICT_MARKET.id),
        HIDDEN,
      ),
    ).toBeNull();
    expect(
      view.queryByTestId(
        activityListRowTitleTestId(POLYMARKET.activity.id),
        HIDDEN,
      ),
    ).toBeNull();
  }
};

/** A snapshot of what Polymarket shows, for the parity check. */
const polymarketSnapshot = (
  view: View,
  { activityRow }: Awaited<ReturnType<typeof readSurfaces>>,
) => ({
  balanceRow: view.getByTestId(HomepageBalanceBreakdownTestIds.VALUE('predict'))
    .props.children,
  activityTitle: activityRow.props.children,
  activitySubtitle: view.getByTestId(
    activityListRowSubtitleTestId(POLYMARKET.activity.id),
    HIDDEN,
  ).props.children,
  activityAmount: view.getByTestId(
    activityListRowPrimaryAmountTestId(POLYMARKET.activity.id),
    HIDDEN,
  ).props.children,
  allSportsShown:
    view.queryByText(strings('trending.all_sports'), HIDDEN) !== null,
  positionShown: view.queryByTestId(LEGACY_POSITION_ROW, HIDDEN) !== null,
});

describeForPlatforms('Predict dual-stack closure: one Venue everywhere', () => {
  beforeEach(() => {
    setupTrendingApiFetchMock();
    stubFetchPath(
      'https://accounts.api.cx.metamask.io',
      '/v4/multiaccount/transactions',
      { data: [], pageInfo: { count: 0, hasNextPage: false } },
    );
    // Online, so Kalshi's live-data and prefetch paths run as in the app.
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    messengerCall.mockClear();
    serveBothVenues();
  });

  afterEach(() => {
    engine.state = originalEngineState;
    clearTrendingApiMocks();
    netInfoMock.__resetMockNetInfo();
    messengerCall.mockImplementation(baseMessengerCall);
    resetPredictNextCatalog();
  });

  it('switches every surface to Kalshi with the picker and back to an identical Polymarket', async () => {
    // ── Polymarket (production lane): every surface reads legacy, Kalshi idles.
    const view = renderJourney();
    const polymarketBefore = await readSurfaces(view, 'polymarket');
    expect(
      view.getByTestId(
        activityListRowSubtitleTestId(POLYMARKET.activity.id),
        HIDDEN,
      ),
    ).toHaveTextContent(POLYMARKET.activityTitle);
    expect(
      view.getByText(strings('trending.all_sports'), HIDDEN),
    ).toBeOnTheScreen();
    expectNoTraceOf(view, 'kalshi');
    expect(kalshiReads()).toBe(0);
    const parityBefore = polymarketSnapshot(view, polymarketBefore);

    // ── Switch to Kalshi with the picker inside Predict, then come back.
    await openPredictFromBalance(view);
    await switchVenueInPredict(view, 'kalshi');
    const legacyReadsAtSwitch = polymarketReads();

    // ── Kalshi: every surface agrees, Polymarket is gone and idle.
    const kalshi = await readSurfaces(view, 'kalshi');
    // A featured card shows the Team abbreviation only. The Team name is on the
    // quote's accessibility label ("Team name, price, buy").
    expect(
      within(kalshi.sportsCard).getByLabelText(/^Packers, /, HIDDEN),
    ).toBeOnTheScreen();
    expect(
      within(kalshi.searchRow).getByText(NFL_1.title, HIDDEN),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(activityListRowPrimaryAmountTestId(KALSHI_TRADE_ID)),
    ).toHaveTextContent('-$28.28');
    expect(
      view.getByTestId(`${PredictHomeSectionTestIds.UNREALIZED_PNL}-value`),
    ).toBeOnTheScreen();
    expectNoTraceOf(view, 'polymarket');
    // Capabilities Kalshi does not have are absent, not empty or disabled:
    // no All Sports list (Polymarket tags), no Claim, no funding entry.
    expect(view.queryByText(strings('trending.all_sports'), HIDDEN)).toBeNull();
    expect(
      view.queryByTestId(
        TrendingViewSelectorsIDs.exploreSportsList('soccer'),
        HIDDEN,
      ),
    ).toBeNull();
    expect(view.queryByText(/claim/i, HIDDEN)).toBeNull();
    expect(
      view.queryByText(strings('predict.deposit.add_funds'), HIDDEN),
    ).toBeNull();
    expect(polymarketReads()).toBe(legacyReadsAtSwitch);

    // ── Navigation agrees: a Kalshi search result opens Kalshi's Event screen
    // inside Predict, never the Polymarket market details.
    fireEvent.press(kalshi.searchRow);
    expect(
      await view.findByTestId(PredictEventScreenTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictMarketDetailsSelectorsIDs.SCREEN),
    ).toBeNull();
    fireEvent.press(view.getByTestId(PredictEventScreenTestIds.BACK));
    // …and the balance row now opens Kalshi's home.
    await openPredictFromBalance(view);
    expect(await view.findByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictMarketListSelectorsIDs.CONTAINER),
    ).toBeNull();

    // ── Back to Polymarket: parity with where the journey started.
    await switchVenueInPredict(view, 'polymarket');
    const kalshiReadsAtSwitch = kalshiReads();
    const polymarketAfter = await readSurfaces(view, 'polymarket');
    expectNoTraceOf(view, 'kalshi');
    expect(polymarketSnapshot(view, polymarketAfter)).toEqual(parityBefore);
    expect(kalshiReads()).toBe(kalshiReadsAtSwitch);
    // Navigation agrees again: a Polymarket result opens the legacy details.
    fireEvent.press(polymarketAfter.searchRow);
    expect(
      await view.findByTestId(PredictMarketDetailsSelectorsIDs.SCREEN),
    ).toBeOnTheScreen();
    expect(view.queryByTestId(PredictEventScreenTestIds.VIEW)).toBeNull();
  });
});
