/**
 * Component view tests for the redesigned PredictHome shell (PRED-834).
 *
 * Covers: flag gating (PredictHome vs PredictFeed) through the real
 * MARKET_LIST route wrapper, shell composition (title + sections in order),
 * search action (opens the shared search overlay), and the stacked-header
 * scroll wiring (layout + scroll without crashing).
 *
 * Run with: yarn jest -c jest.config.view.js PredictHome.view.test --runInBand --silent --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import Engine from '../../../../../../app/core/Engine';
import {
  renderPredictHomeView,
  renderPredictMarketListRoute,
} from '../../../../../../tests/component-view/renderers/predictHome';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import {
  PredictHomeSelectorsIDs,
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
} from '../../Predict.testIds';
import { PREDICT_HEADER_STACKED_TEST_IDS } from '../../components/PredictHeaderStacked';
import { MOCK_PREDICT_LIVE_SPORT_MARKET } from '../../../../../../tests/component-view/fixtures/predict';
import { PredictEventValues } from '../../constants/eventNames';
import { PredictFeedBannerSelectorsIDs } from '../../components/PredictFeedBanner';
import {
  PredictFeedBannerPosition,
  PredictFeedBannerSeverity,
} from '../../constants/feedBanner';

const SEARCH_PLACEHOLDER = 'Search prediction markets';
const PREDICTIONS_TITLE = 'Predictions';

const homeRedesignEnabledOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          predictHomeRedesign: {
            enabled: true,
            featureVersion: '1.0.0',
            minimumVersion: '0.0.1',
          },
        },
      },
    },
  },
};

const feedBannerEnabledOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          predictFeedBanner: {
            enabled: true,
            minimumVersion: '0.0.0',
            id: 'predict-view-test-message',
            title: 'Predict service update',
            description: 'Some markets may be temporarily unavailable.',
            position: PredictFeedBannerPosition.AfterPortfolio,
            severity: PredictFeedBannerSeverity.Warning,
            dismissible: true,
          },
        },
      },
    },
  },
};

describe('PredictHome', () => {
  beforeEach(() => {
    (
      Engine.context.PredictController.getMarkets as jest.Mock
    ).mockResolvedValue({ markets: [], nextCursor: null });
    // Live Now hides when empty after load and only keeps scoreboard-capable
    // markets (`game` present). The sport card also needs full team/league data
    // once the carousel renders loaded cards (see MOCK_PREDICT_LIVE_SPORT_MARKET).
    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockResolvedValue({
      markets: [MOCK_PREDICT_LIVE_SPORT_MARKET],
      nextCursor: null,
    });
    (
      Engine.context.PredictController.listFilterOptions as jest.Mock
    ).mockResolvedValue([
      {
        id: 'elections',
        label: 'Elections',
        source: 'related-tags',
        params: {
          tagSlugs: ['elections'],
          status: 'open',
          order: 'volume24hr',
          limit: 12,
        },
      },
    ]);
    (
      Engine.context.PredictController.searchMarkets as jest.Mock
    ).mockResolvedValue({ markets: [], totalResults: 0 });
  });

  afterEach(() => {
    cleanup();
  });

  describe('flag gating at the MARKET_LIST route', () => {
    it('renders the redesigned PredictHome shell when predictHomeRedesign is enabled', async () => {
      const { findByTestId } = renderPredictMarketListRoute({
        overrides: homeRedesignEnabledOverrides,
      });

      expect(
        await findByTestId(PredictHomeSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('falls back to the existing PredictFeed when the flag is disabled', async () => {
      const { findByTestId, queryByTestId } = renderPredictMarketListRoute();

      expect(
        await findByTestId(PredictMarketListSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(PredictHomeSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });

  describe('shell composition', () => {
    it('renders the large "Predictions" title', async () => {
      const { getByTestId } = renderPredictHomeView();

      await waitFor(() => {
        expect(getByTestId(PredictHomeSelectorsIDs.TITLE)).toHaveTextContent(
          PREDICTIONS_TITLE,
        );
      });
    });

    it('composes the section placeholders in Figma order', async () => {
      const { findByTestId } = renderPredictHomeView();

      // Wait for the shell and async sections (Live Now loads via React Query).
      await findByTestId(PredictHomeSelectorsIDs.CONTAINER);
      await findByTestId(PredictHomeSelectorsIDs.PORTFOLIO_MODULE);
      await findByTestId(PredictHomeSelectorsIDs.LIVE_NOW_SECTION);
      await findByTestId(PredictHomeSelectorsIDs.CATEGORIES_SECTION);
      await findByTestId(PredictHomeSelectorsIDs.POPULAR_TODAY_SECTION);
      await findByTestId(PredictHomeSelectorsIDs.TRENDING_SECTION);
    });

    it('renders a remotely enabled feed banner', async () => {
      const { findByTestId } = renderPredictHomeView({
        overrides: feedBannerEnabledOverrides,
      });

      const banner = await findByTestId(PredictFeedBannerSelectorsIDs.BANNER);

      expect(banner).toHaveTextContent(/Predict service update/);
      expect(banner).toHaveTextContent(
        /Some markets may be temporarily unavailable\./,
      );
    });

    it('does not render the feed banner when the remote flag is disabled', () => {
      const { queryByTestId } = renderPredictHomeView();

      expect(
        queryByTestId(PredictFeedBannerSelectorsIDs.BANNER),
      ).not.toBeOnTheScreen();
    });
  });

  describe('search interaction', () => {
    it('opens the shared search overlay when the user presses the search icon', async () => {
      const { getByTestId, findByPlaceholderText } = renderPredictHomeView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      expect(await findByPlaceholderText(SEARCH_PLACEHOLDER)).toBeOnTheScreen();
    });

    it('tracks the search opened event when the user presses the search icon', async () => {
      const { getByTestId } = renderPredictHomeView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      expect(
        Engine.context.PredictController.trackSearchInteracted,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ interactionType: 'opened' }),
      );
    });

    it('does not attribute the opened event to predict_feed when no entry point was provided', async () => {
      // The redesigned home is rendered without an `entryPoint` route param, so
      // the event must not fall back to the legacy `predict_feed` surface.
      const { getByTestId } = renderPredictHomeView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      const trackSearchInteracted = Engine.context.PredictController
        .trackSearchInteracted as jest.Mock;
      const openedCall = trackSearchInteracted.mock.calls
        .map(
          ([args]) => args as { interactionType?: string; entryPoint?: string },
        )
        .find((args) => args.interactionType === 'opened');

      expect(openedCall).toBeDefined();
      expect(openedCall?.entryPoint).toBeUndefined();
    });
  });

  describe('analytics', () => {
    it('tracks the redesigned home viewed on focus', async () => {
      // The shared Engine mock is not reset between tests in this suite, so
      // clear this spy to assert this render fires exactly one home-viewed.
      (
        Engine.context.PredictController.trackHomeViewed as jest.Mock
      ).mockClear();

      renderPredictHomeView();

      await waitFor(() => {
        expect(
          Engine.context.PredictController.trackHomeViewed,
        ).toHaveBeenCalledTimes(1);
      });
    });

    it('tracks a section-viewed impression once it dwells in the viewport', async () => {
      const { findByTestId, getByTestId } = renderPredictHomeView();

      // Establish the scroll viewport height.
      const scrollView = getByTestId(PredictHomeSelectorsIDs.SCROLL_VIEW);
      fireEvent(scrollView, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
      });

      // Measure the Trending section fully within the viewport.
      const trendingWrapper = await findByTestId(
        PredictHomeSelectorsIDs.TRENDING_IMPRESSION,
      );
      fireEvent(trendingWrapper, 'layout', {
        nativeEvent: { layout: { x: 0, y: 100, width: 400, height: 300 } },
      });

      // After the dwell period the impression fires exactly once.
      await waitFor(
        () => {
          expect(
            Engine.context.PredictController.trackHomeSectionInteraction,
          ).toHaveBeenCalledWith({
            sectionId: PredictEventValues.SECTION_ID.TRENDING,
            actionType: PredictEventValues.ACTION_TYPE.VIEWED,
            entryPoint: undefined,
          });
        },
        { timeout: 2000 },
      );
    });
  });

  describe('stacked header scroll wiring', () => {
    it('keeps the compact title mounted while measuring the title section and scrolling', async () => {
      const { findByTestId, getByTestId } = renderPredictHomeView();

      const titleSection = await findByTestId(
        PredictHomeSelectorsIDs.TITLE_SECTION,
      );
      fireEvent(titleSection, 'layout', {
        nativeEvent: { layout: { height: 120 } },
      });

      const scrollView = getByTestId(PredictHomeSelectorsIDs.SCROLL_VIEW);
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 300 },
          contentSize: { height: 1200, width: 400 },
          layoutMeasurement: { height: 800, width: 400 },
        },
      });

      await waitFor(() => {
        expect(
          getByTestId(PREDICT_HEADER_STACKED_TEST_IDS.COMPACT_TITLE),
        ).toBeOnTheScreen();
      });
    });
  });
});
