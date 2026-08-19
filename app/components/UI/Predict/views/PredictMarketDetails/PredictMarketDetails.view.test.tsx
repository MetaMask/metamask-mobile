/**
 * Component view tests for PredictMarketDetails.
 *
 * Behaviour is driven through Engine spies (getMarket, getPositions,
 * getPriceHistory, claimWithConfirmation), route params and Redux overrides —
 * never by mocking hooks. The sibling unit file keeps only the contracts that
 * are not observable from the screen (hook call arguments, chart fidelity).
 *
 * Run with: yarn jest -c jest.config.view.js PredictMarketDetails.view.test --runInBand --silent --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import Engine from '../../../../../../app/core/Engine';
import {
  renderPredictMarketDetailsView,
  renderPredictMarketDetailsViewWithRoutes,
} from '../../../../../../tests/component-view/renderers/predictMarketDetails';
import {
  act,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { Image } from 'expo-image';
import {
  getPredictMarketDetailsSelector,
  PredictCryptoUpDownDetailsSelectorsIDs,
  PredictMarketDetailsSelectorsIDs,
} from '../../Predict.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import {
  MOCK_PREDICT_MARKET,
  MOCK_PREDICT_CLOSED_MARKET,
  MOCK_PREDICT_LIVE_SPORT_MARKET,
  MOCK_PREDICT_MULTI_OUTCOME_MARKET,
  MOCK_PREDICT_PARTIALLY_RESOLVED_MARKET,
  buildMockPredictPosition,
} from '../../../../../../tests/component-view/fixtures/predict';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from '../../components/PredictGameDetailsContent/PredictGameDetailsContent.testIds';
import type {
  PredictMarket,
  PredictPosition,
  PredictPriceHistoryPoint,
} from '../../types';

const MARKET_ID = MOCK_PREDICT_MARKET.id;

const controllerMock = (
  method: keyof typeof Engine.context.PredictController,
): jest.Mock =>
  Engine.context.PredictController[method] as unknown as jest.Mock;

const givenMarket = (market: PredictMarket | null) =>
  controllerMock('getMarket').mockResolvedValue(market);

const givenPositions = (positions: PredictPosition[]) =>
  controllerMock('getPositions').mockResolvedValue(positions);

const givenPriceHistory = (points: PredictPriceHistoryPoint[]) =>
  controllerMock('getPriceHistory').mockResolvedValue(points);

/** Redux delta that makes the user eligible to trade. */
const ELIGIBLE_USER = {
  engine: {
    backgroundState: {
      PredictController: {
        eligibility: { eligible: true, country: 'US' },
      },
    },
  },
};

/**
 * Eligible user with the bottom sheet flag on, so buy previews open in place
 * instead of navigating to the full-screen preview route.
 */
const ELIGIBLE_USER_WITH_BUY_SHEET = {
  engine: {
    backgroundState: {
      PredictController: {
        eligibility: { eligible: true, country: 'US' },
      },
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          predictBottomSheet: {
            enabled: true,
            featureVersion: '1.0.0',
            minimumVersion: '0.0.1',
          },
        },
      },
    },
  },
};

/** Redux delta that turns on the dedicated crypto up/down details screen. */
const UP_DOWN_ENABLED = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          predictUpDown: {
            enabled: true,
            featureVersion: '1.0.0',
            minimumVersion: '0.0.1',
          },
        },
      },
    },
  },
};

/** `isCryptoUpDown` requires series metadata plus the crypto and up-or-down tags. */
const CRYPTO_UP_DOWN_MARKET: PredictMarket = {
  ...MOCK_PREDICT_MARKET,
  id: 'market-btc-up-down',
  slug: 'btc-up-or-down-5m',
  title: 'BTC Up or Down - 5 Minutes',
  category: 'crypto',
  tags: ['crypto', 'up-or-down', 'bitcoin'],
  endDate: '2026-12-31T00:05:00.000Z',
  series: {
    id: 'btc-up-down-series',
    slug: 'btc-up-or-down-5m',
    title: 'BTC Up or Down - 5 Minutes',
    recurrence: '5m',
  },
};

/** Redux delta that waives fees for markets tagged `middle-east`. */
const FEES_WAIVED_FOR_MIDDLE_EAST = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          predictFeeCollection: {
            enabled: true,
            collector: '0x0000000000000000000000000000000000000001',
            metamaskFee: 0.02,
            providerFee: 0.02,
            waiveList: ['middle-east'],
            executors: [],
            permit2Enabled: false,
          },
        },
      },
    },
  },
};

describe('PredictMarketDetails', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    givenMarket(MOCK_PREDICT_MARKET);
    givenPositions([]);
    givenPriceHistory([]);
    controllerMock('getMarketSeries').mockResolvedValue([]);
    controllerMock('claimWithConfirmation').mockResolvedValue(undefined);
  });

  describe('initial load', () => {
    it('calls getMarket with the marketId from route params when the screen mounts', async () => {
      const getMarketSpy = controllerMock('getMarket');

      renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      await waitFor(() => {
        expect(getMarketSpy).toHaveBeenCalledWith(
          expect.objectContaining({ marketId: MARKET_ID }),
        );
      });
    });

    it('shows complete market data in the details screen after getMarket resolves', async () => {
      const { findByTestId, findByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      const screen = await findByTestId(
        PredictMarketDetailsSelectorsIDs.SCREEN,
      );
      await waitFor(() => {
        expect(
          within(screen).getByText(MOCK_PREDICT_MARKET.title),
        ).toBeOnTheScreen();
      });
      expect(await findByText('Yes • 65¢')).toBeOnTheScreen();
      expect(await findByText('No • 35¢')).toBeOnTheScreen();
    });

    it('shows the loading skeleton until the market request resolves', async () => {
      let resolveMarket: (market: PredictMarket) => void = () => undefined;
      controllerMock('getMarket').mockImplementation(
        () =>
          new Promise<PredictMarket>((resolve) => {
            resolveMarket = resolve;
          }),
      );

      const { findByTestId, queryByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      expect(
        await findByTestId(
          PredictMarketDetailsSelectorsIDs.DETAILS_CONTENT_SKELETON_LINE_1,
        ),
      ).toBeOnTheScreen();

      resolveMarket(MOCK_PREDICT_MARKET);

      await waitFor(() => {
        expect(
          queryByTestId(
            PredictMarketDetailsSelectorsIDs.DETAILS_CONTENT_SKELETON_LINE_1,
          ),
        ).not.toBeOnTheScreen();
      });
    });

    it('keeps showing the loading skeleton when the route carries no resolvable market', async () => {
      givenMarket(null);

      const { findByTestId, queryByTestId } = renderPredictMarketDetailsView({
        initialParams: {
          series: { id: '', slug: '', title: '', recurrence: '5m' },
        },
      });

      expect(
        await findByTestId(
          PredictMarketDetailsSelectorsIDs.DETAILS_CONTENT_SKELETON_LINE_1,
        ),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(PredictMarketDetailsSelectorsIDs.MARKET_UNAVAILABLE),
      ).not.toBeOnTheScreen();
    });

    it('prefers the title and image from route params over the loaded market data', async () => {
      let resolveMarket: (market: PredictMarket) => void = () => undefined;
      controllerMock('getMarket').mockImplementation(
        () =>
          new Promise<PredictMarket>((resolve) => {
            resolveMarket = resolve;
          }),
      );

      const { findByTestId, findByText, queryByText, UNSAFE_getByType } =
        renderPredictMarketDetailsView({
          initialParams: {
            marketId: MARKET_ID,
            title: 'Title from the feed card',
            image: 'https://example.com/feed-card.png',
          },
        });

      expect(
        await findByTestId(
          PredictMarketDetailsSelectorsIDs.DETAILS_CONTENT_SKELETON_LINE_1,
        ),
      ).toBeOnTheScreen();
      expect(queryByText('Title from the feed card')).not.toBeOnTheScreen();

      await act(async () => {
        resolveMarket({
          ...MOCK_PREDICT_MARKET,
          title: 'Title from getMarket',
          image: 'https://example.com/market.png',
        });
      });

      expect(await findByText('Title from the feed card')).toBeOnTheScreen();
      expect(queryByText('Title from getMarket')).not.toBeOnTheScreen();
      expect(UNSAFE_getByType(Image).props.source).toEqual({
        uri: 'https://example.com/feed-card.png',
      });
    });

    it('tracks geo block and navigates to unavailable modal when the user presses a bet button while ineligible', async () => {
      const trackGeoBlockSpy = controllerMock('trackGeoBlockTriggered');

      const { findByText, findByTestId } =
        renderPredictMarketDetailsViewWithRoutes({
          initialParams: { marketId: MARKET_ID },
          extraRoutes: [{ name: Routes.PREDICT.MODALS.ROOT }],
        });

      fireEvent.press(await findByText(/Yes.*¢/));

      await waitFor(() => {
        expect(trackGeoBlockSpy).toHaveBeenCalledWith(
          expect.objectContaining({ attemptedAction: 'predict_action' }),
        );
      });
      expect(
        await findByTestId(`route-${Routes.PREDICT.MODALS.ROOT}`),
      ).toBeOnTheScreen();
    });

    it('shows the share button once the market has loaded', async () => {
      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      expect(
        await findByTestId(PredictMarketDetailsSelectorsIDs.SHARE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('resolves the market from the series in route params when no marketId is given', async () => {
      const seriesMarket = {
        ...MOCK_PREDICT_MARKET,
        id: 'market-from-series',
        title: 'Resolved from series',
      };
      controllerMock('getMarketSeries').mockResolvedValue([seriesMarket]);
      givenMarket(seriesMarket);

      const { findByText } = renderPredictMarketDetailsView({
        initialParams: {
          series: {
            id: 'btc-series',
            slug: 'btc-up-or-down-5m',
            title: 'BTC Up or Down',
            recurrence: '5m',
          },
        },
      });

      expect(await findByText('Resolved from series')).toBeOnTheScreen();
    });

    it('calls trackMarketDetailsOpened when the market and positions finish loading', async () => {
      const trackSpy = controllerMock('trackMarketDetailsOpened');

      renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      await waitFor(() => {
        expect(trackSpy).toHaveBeenCalledWith(
          expect.objectContaining({ marketId: MARKET_ID }),
        );
      });
    });

    it('reports the entry point the user arrived from', async () => {
      const trackSpy = controllerMock('trackMarketDetailsOpened');

      renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID, entryPoint: 'explore' },
      });

      await waitFor(() => {
        expect(trackSpy).toHaveBeenCalledWith(
          expect.objectContaining({ entryPoint: 'explore' }),
        );
      });
    });
  });

  describe('back navigation', () => {
    it('navigates to the Predict root when the user presses back from the details screen', async () => {
      const { findByTestId } = renderPredictMarketDetailsViewWithRoutes({
        initialParams: { marketId: MARKET_ID },
        extraRoutes: [{ name: Routes.PREDICT.ROOT }],
      });

      await findByTestId(PredictMarketDetailsSelectorsIDs.SCREEN);

      fireEvent.press(
        await findByTestId(PredictMarketDetailsSelectorsIDs.BACK_BUTTON),
      );

      expect(
        await findByTestId(`route-${Routes.PREDICT.ROOT}`),
      ).toBeOnTheScreen();
    });
  });

  describe('about tab', () => {
    it('shows volume, end date and the resolution provider for the loaded market', async () => {
      givenMarket({ ...MOCK_PREDICT_MARKET, endDate: '2026-12-31' });

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      const aboutTab = await findByTestId(
        PredictMarketDetailsSelectorsIDs.ABOUT_TAB_CONTENT,
      );
      expect(within(aboutTab).getByText('Volume')).toBeOnTheScreen();
      expect(within(aboutTab).getByText('$1M')).toBeOnTheScreen();
      expect(within(aboutTab).getByText('End date')).toBeOnTheScreen();
      expect(
        within(aboutTab).getByText(new Date('2026-12-31').toLocaleDateString()),
      ).toBeOnTheScreen();
      expect(within(aboutTab).getByText('Polymarket')).toBeOnTheScreen();
      expect(
        within(aboutTab).getByText(MOCK_PREDICT_MARKET.description),
      ).toBeOnTheScreen();
    });

    it('shows N/A as the end date when the market has none', async () => {
      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      const aboutTab = await findByTestId(
        PredictMarketDetailsSelectorsIDs.ABOUT_TAB_CONTENT,
      );
      expect(within(aboutTab).getByText('N/A')).toBeOnTheScreen();
    });

    it('opens the Polymarket resolution docs when the user presses the provider link', async () => {
      const { findByTestId, findByText } =
        renderPredictMarketDetailsViewWithRoutes({
          initialParams: { marketId: MARKET_ID },
          extraRoutes: [{ name: Routes.WEBVIEW.MAIN }],
        });

      await findByTestId(PredictMarketDetailsSelectorsIDs.ABOUT_TAB_CONTENT);
      fireEvent.press(await findByText('Polymarket'));

      expect(
        await findByTestId(`route-${Routes.WEBVIEW.MAIN}`),
      ).toBeOnTheScreen();
    });
  });

  describe('tabs', () => {
    it('shows only the About tab for an open binary market with no positions', async () => {
      const { findByTestId, queryByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      await findByTestId(PredictMarketDetailsSelectorsIDs.ABOUT_TAB);
      expect(
        queryByTestId(PredictMarketDetailsSelectorsIDs.POSITIONS_TAB),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB),
      ).not.toBeOnTheScreen();
    });

    it('adds an Outcomes tab for a market with several outcomes', async () => {
      givenMarket(MOCK_PREDICT_MULTI_OUTCOME_MARKET);

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MOCK_PREDICT_MULTI_OUTCOME_MARKET.id },
      });

      expect(
        await findByTestId(PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB),
      ).toBeOnTheScreen();
    });

    it('shows the user position and a cash out CTA on the Positions tab', async () => {
      givenPositions([buildMockPredictPosition()]);

      const { findByTestId, findByText, getByTestId } =
        renderPredictMarketDetailsView({
          initialParams: { marketId: MARKET_ID },
        });

      await findByTestId(
        PredictMarketDetailsSelectorsIDs.POSITIONS_TAB_CONTENT,
      );
      // The current value stays behind a skeleton until the sell-order preview
      // query settles, which happens after the tab content is already on screen.
      await findByText('$60');

      const positionsTab = getByTestId(
        PredictMarketDetailsSelectorsIDs.POSITIONS_TAB_CONTENT,
      );
      expect(
        within(positionsTab).getByText('$50 on Yes to win $50'),
      ).toBeOnTheScreen();
      expect(within(positionsTab).getByText('$60')).toBeOnTheScreen();
      expect(
        within(positionsTab).getByTestId(
          PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('opens the sell preview sheet when the user cashes a position out', async () => {
      givenPositions([buildMockPredictPosition()]);

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
        overrides: ELIGIBLE_USER_WITH_BUY_SHEET,
      });

      fireEvent.press(
        await findByTestId(
          PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON,
        ),
      );

      expect(
        await findByTestId(PredictMarketDetailsSelectorsIDs.SELL_PREVIEW_SHEET),
      ).toBeOnTheScreen();
    });

    it('tracks the newly selected tab when the user switches tabs', async () => {
      givenMarket(MOCK_PREDICT_MULTI_OUTCOME_MARKET);
      const trackSpy = controllerMock('trackMarketDetailsOpened');

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MOCK_PREDICT_MULTI_OUTCOME_MARKET.id },
      });

      fireEvent.press(
        await findByTestId(PredictMarketDetailsSelectorsIDs.ABOUT_TAB),
      );

      await waitFor(() => {
        expect(trackSpy).toHaveBeenCalledWith(
          expect.objectContaining({ marketDetailsViewed: 'about' }),
        );
      });
    });
  });

  describe('buy actions', () => {
    it('shows 0¢ on the buy buttons when the outcome has no tradable price', async () => {
      givenMarket({
        ...MOCK_PREDICT_MARKET,
        outcomes: [
          {
            ...MOCK_PREDICT_MARKET.outcomes[0],
            tokens: [
              { id: 'token-yes', title: 'Yes', price: 0 },
              { id: 'token-no', title: 'No', price: 0 },
            ],
          },
        ],
      });

      const { findByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      expect(await findByText('Yes • 0¢')).toBeOnTheScreen();
      expect(await findByText('No • 0¢')).toBeOnTheScreen();
    });

    // Whether the bottom action bar renders at all for a multi-outcome market
    // is owned by PredictMarketDetailsActions.test.tsx ("renders nothing when
    // no action state is active"); the bar has no testID to assert on here.
    it('lists every outcome of a multi-outcome market on the Outcomes tab', async () => {
      givenMarket(MOCK_PREDICT_MULTI_OUTCOME_MARKET);

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MOCK_PREDICT_MULTI_OUTCOME_MARKET.id },
      });

      const outcomesTab = await findByTestId(
        PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB_CONTENT,
      );
      expect(within(outcomesTab).getByText('Alice')).toBeOnTheScreen();
      expect(within(outcomesTab).getByText('Bob')).toBeOnTheScreen();
      expect(within(outcomesTab).getByText('Carol')).toBeOnTheScreen();
    });

    it('opens the buy preview sheet when an eligible user presses a bet button', async () => {
      const { findByText, findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
        overrides: ELIGIBLE_USER_WITH_BUY_SHEET,
      });

      fireEvent.press(await findByText('Yes • 65¢'));

      expect(
        await findByTestId(PredictMarketDetailsSelectorsIDs.BUY_PREVIEW_SHEET),
      ).toBeOnTheScreen();
    });
  });

  describe('fee waiver', () => {
    it('tells the user fees are waived when the market carries a waived tag', async () => {
      givenMarket({ ...MOCK_PREDICT_MARKET, tags: ['middle-east'] });

      const { findByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
        overrides: FEES_WAIVED_FOR_MIDDLE_EAST,
      });

      expect(
        await findByText("We don't charge any fees on this market."),
      ).toBeOnTheScreen();
    });

    it('does not mention waived fees for a market outside the waive list', async () => {
      givenMarket({ ...MOCK_PREDICT_MARKET, tags: ['politics'] });

      const { findByTestId, queryByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
        overrides: FEES_WAIVED_FOR_MIDDLE_EAST,
      });

      await findByTestId(PredictMarketDetailsSelectorsIDs.ABOUT_TAB_CONTENT);
      expect(
        queryByText("We don't charge any fees on this market."),
      ).not.toBeOnTheScreen();
    });
  });

  describe('closed market', () => {
    it('shows the resolved outcome and opens on the Outcomes tab', async () => {
      givenMarket(MOCK_PREDICT_CLOSED_MARKET);

      const { findByTestId, findByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: MOCK_PREDICT_CLOSED_MARKET.id },
      });

      expect(await findByText('Market resulted to Yes')).toBeOnTheScreen();
      expect(
        await findByTestId(
          PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB_CONTENT,
        ),
      ).toBeOnTheScreen();
    });

    it('lets the user switch to the About tab on a closed market', async () => {
      givenMarket(MOCK_PREDICT_CLOSED_MARKET);

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MOCK_PREDICT_CLOSED_MARKET.id },
      });

      fireEvent.press(
        await findByTestId(PredictMarketDetailsSelectorsIDs.ABOUT_TAB),
      );

      expect(
        await findByTestId(PredictMarketDetailsSelectorsIDs.ABOUT_TAB_CONTENT),
      ).toBeOnTheScreen();
    });

    it('claims through the controller when the user presses the claim button', async () => {
      givenMarket(MOCK_PREDICT_CLOSED_MARKET);
      givenPositions([
        buildMockPredictPosition({
          marketId: MOCK_PREDICT_CLOSED_MARKET.id,
          claimable: true,
          percentPnl: 42,
        }),
      ]);
      const claimSpy = controllerMock('claimWithConfirmation');

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MOCK_PREDICT_CLOSED_MARKET.id },
        overrides: ELIGIBLE_USER,
      });

      fireEvent.press(
        await findByTestId(
          PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON,
        ),
      );

      await waitFor(() => {
        expect(claimSpy).toHaveBeenCalled();
      });
    });
  });

  describe('partially resolved market', () => {
    it('expands the resolved outcomes section when the user presses it', async () => {
      givenMarket(MOCK_PREDICT_PARTIALLY_RESOLVED_MARKET);

      const { findByTestId, findByText, queryByTestId } =
        renderPredictMarketDetailsView({
          initialParams: {
            marketId: MOCK_PREDICT_PARTIALLY_RESOLVED_MARKET.id,
          },
        });

      fireEvent.press(
        await findByTestId(PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB),
      );

      const resolvedSection = await findByText('Resolved outcomes');
      expect(
        queryByTestId(getPredictMarketDetailsSelector.icon('ArrowUp')),
      ).not.toBeOnTheScreen();

      fireEvent.press(resolvedSection);

      expect(
        await findByTestId(getPredictMarketDetailsSelector.icon('ArrowUp')),
      ).toBeOnTheScreen();
    });
  });

  // The chart renders no testID of its own, so it is identified by the
  // timeframe selector it always renders alongside the graph.
  describe('chart', () => {
    it('shows the price chart with its timeframe options for a market with an open outcome', async () => {
      givenPriceHistory([
        { timestamp: 1_767_225_600, price: 0.6 },
        { timestamp: 1_767_312_000, price: 0.65 },
      ]);

      const { findByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      expect(await findByText('1D')).toBeOnTheScreen();
      expect(await findByText('MAX')).toBeOnTheScreen();
    });

    it('requests price history for the timeframe the user selects', async () => {
      const getPriceHistorySpy = controllerMock('getPriceHistory');

      const { findByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      fireEvent.press(await findByText('1W'));

      await waitFor(() => {
        expect(getPriceHistorySpy).toHaveBeenCalledWith(
          expect.objectContaining({ interval: '1w' }),
        );
      });
    });

    it('hides the chart when the market has no open outcome', async () => {
      givenMarket(MOCK_PREDICT_CLOSED_MARKET);

      const { findByTestId, queryByText } = renderPredictMarketDetailsView({
        initialParams: { marketId: MOCK_PREDICT_CLOSED_MARKET.id },
      });

      await findByTestId(PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB_CONTENT);
      expect(queryByText('MAX')).not.toBeOnTheScreen();
    });
  });

  describe('branch screens', () => {
    it('shows the game scoreboard instead of the standard details for a game market', async () => {
      givenMarket(MOCK_PREDICT_LIVE_SPORT_MARKET);

      const { findByTestId, queryByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MOCK_PREDICT_LIVE_SPORT_MARKET.id },
      });

      expect(
        await findByTestId(
          PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_SCOREBOARD,
        ),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(PredictMarketDetailsSelectorsIDs.TAB_BAR),
      ).not.toBeOnTheScreen();
    });

    it('shows the crypto up/down screen when the flag is on and the market is an up/down market', async () => {
      givenMarket(CRYPTO_UP_DOWN_MARKET);

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: CRYPTO_UP_DOWN_MARKET.id },
        overrides: UP_DOWN_ENABLED,
      });

      expect(
        await findByTestId(PredictCryptoUpDownDetailsSelectorsIDs.SCREEN),
      ).toBeOnTheScreen();
    });

    it('shows the standard details screen for an up/down market while the flag is off', async () => {
      givenMarket(CRYPTO_UP_DOWN_MARKET);

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: CRYPTO_UP_DOWN_MARKET.id },
      });

      expect(
        await findByTestId(PredictMarketDetailsSelectorsIDs.SCREEN),
      ).toBeOnTheScreen();
    });
  });

  describe('pull to refresh', () => {
    it('refetches the market, its price history and the positions', async () => {
      const getMarketSpy = controllerMock('getMarket');
      const getPositionsSpy = controllerMock('getPositions');
      const getPriceHistorySpy = controllerMock('getPriceHistory');

      const { findByTestId } = renderPredictMarketDetailsView({
        initialParams: { marketId: MARKET_ID },
      });

      const scrollView = await findByTestId(
        PredictMarketDetailsSelectorsIDs.SCROLLABLE_TAB_VIEW,
      );
      await waitFor(() => {
        expect(getPriceHistorySpy).toHaveBeenCalled();
      });

      const marketCallsBefore = getMarketSpy.mock.calls.length;
      const positionCallsBefore = getPositionsSpy.mock.calls.length;
      const priceHistoryCallsBefore = getPriceHistorySpy.mock.calls.length;

      await act(async () => {
        await scrollView.props.refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(getMarketSpy.mock.calls.length).toBeGreaterThan(
          marketCallsBefore,
        );
      });
      expect(getPositionsSpy.mock.calls.length).toBeGreaterThan(
        positionCallsBefore,
      );
      expect(getPriceHistorySpy.mock.calls.length).toBeGreaterThan(
        priceHistoryCallsBefore,
      );
    });
  });
});
