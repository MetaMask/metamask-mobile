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
  type RenderAPI,
} from '@testing-library/react-native';
import { EXPLORE_TAB_INDEX } from '../../../../constants/navigation/exploreTabIndices';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { strings } from '../../../../../locales/i18n';
import type { PredictConfig } from '../config/predictConfig';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';

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
const ALL_SPORTS_TITLE = strings('trending.all_sports');

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

describeForPlatforms('Explore prediction sections', () => {
  beforeEach(() => {
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
    it('leaves the Now tab Predict section out until the Venue is Polymarket', async () => {
      const view = renderExplore({
        predictConfig: BOTH_VENUES,
        venueSelectionPreference: 'kalshi',
      });
      await waitFor(() =>
        expect(
          view.getByTestId(TrendingViewSelectorsIDs.EXPLORE_NOW_SCROLL_VIEW),
        ).toBeOnTheScreen(),
      );

      expect(view.queryByText(PREDICT_SECTION_TITLE)).not.toBeOnTheScreen();
      expect(view.queryByText(MOCK_PREDICT_MARKET.title)).not.toBeOnTheScreen();
      expect(getMarkets).not.toHaveBeenCalled();

      selectVenue(view, 'polymarket');

      expect(await view.findByText(PREDICT_SECTION_TITLE)).toBeOnTheScreen();
      expect(
        await view.findByText(MOCK_PREDICT_MARKET.title),
      ).toBeOnTheScreen();
    });

    it('leaves the Sports tab All Sports list out until the Venue is Polymarket', async () => {
      const view = renderExplore({
        predictConfig: BOTH_VENUES,
        venueSelectionPreference: 'kalshi',
      });

      await openSportsTab(view.getByTestId);

      expect(view.queryByText(ALL_SPORTS_TITLE)).not.toBeOnTheScreen();
      expect(
        view.queryByText(strings('trending.all_sports_no_markets')),
      ).not.toBeOnTheScreen();
      expect(getMarkets).not.toHaveBeenCalled();

      selectVenue(view, 'polymarket');

      expect(await view.findByText(ALL_SPORTS_TITLE)).toBeOnTheScreen();
      await waitFor(() =>
        expect(getMarkets).toHaveBeenCalledWith(
          expect.objectContaining({ customQueryParams: 'tag_id=100350' }),
        ),
      );
    });

    it('offers no Predictions search pill and runs no Polymarket search', async () => {
      const { findByTestId, getByTestId, queryByTestId } = renderExplore({
        predictConfig: BOTH_VENUES,
        venueSelectionPreference: 'kalshi',
      });
      await waitFor(() =>
        expect(
          getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
        ).toBeOnTheScreen(),
      );
      await actButtonPress(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
      );
      const searchInput = await findByTestId(
        TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
      );

      await userEvent.type(searchInput, 'bitcoin');

      expect(
        await findByTestId(ExploreSearchScreenSelectorsIDs.PILL_CRYPTOS),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(ExploreSearchScreenSelectorsIDs.PILL_PREDICTIONS),
      ).not.toBeOnTheScreen();
      expect(searchMarkets).not.toHaveBeenCalled();
    });
  });
});
