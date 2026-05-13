/**
 * Component view tests for PredictFeed.
 *
 * These are the first component view tests for the Predict area.
 * They test user-oriented behaviour via Engine spies and real interactions —
 * not static render checks.
 *
 * Run with: yarn jest -c jest.config.view.js PredictFeed.view.test --runInBand --silent --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import Engine from '../../../../../../app/core/Engine';
import {
  renderPredictFeedView,
  renderPredictFeedViewWithRoutes,
} from '../../../../../../tests/component-view/renderers/predict';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import {
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
  PredictBalanceSelectorsIDs,
  PredictCryptoUpDownMarketCardSelectorsIDs,
  getPredictSearchSelector,
} from '../../Predict.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { MOCK_PREDICT_MARKET } from '../../../../../../tests/component-view/fixtures/predict';
import { Recurrence, type PredictMarket } from '../../types';

const predictUpDownFlagOverrides = {
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

const createCryptoUpDownMarket = (
  id: string,
  endDate: string,
): PredictMarket => ({
  id,
  providerId: 'polymarket',
  slug: `${id}-btc-up-or-down-5m`,
  title: 'BTC Up or Down - 5 Minutes',
  description: 'BTC Up or Down',
  image: 'https://example.com/btc.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['crypto', 'up-or-down', 'bitcoin'],
  outcomes: [
    {
      id: `${id}-outcome`,
      providerId: 'polymarket',
      marketId: id,
      title: 'BTC Up or Down',
      description: '',
      image: '',
      status: 'open',
      tokens: [
        { id: `${id}-up`, title: 'Up', price: 0.4 },
        { id: `${id}-down`, title: 'Down', price: 0.6 },
      ],
      volume: 1_500_000,
      groupItemTitle: 'BTC',
    },
  ],
  liquidity: 500_000,
  volume: 1_500_000,
  endDate,
  series: {
    id: 'btc-up-down-series',
    slug: 'btc-up-or-down-5m',
    title: 'BTC Up or Down - 5 Minutes',
    recurrence: '5m',
  },
});

const SEARCH_PLACEHOLDER = 'Search prediction markets';
const CANCEL_TEXT = 'Cancel';

describe('PredictFeed', () => {
  describe('search interaction', () => {
    it('opens the search overlay when the user presses the search icon', async () => {
      const { getByTestId, findByPlaceholderText } = renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      expect(await findByPlaceholderText(SEARCH_PLACEHOLDER)).toBeOnTheScreen();
    });

    it('calls PredictController.getMarkets with the typed query after the user searches', async () => {
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );

      const { getByTestId, findByPlaceholderText } = renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      const searchInput = await findByPlaceholderText(SEARCH_PLACEHOLDER);
      fireEvent.changeText(searchInput, 'bitcoin');

      await waitFor(
        () => {
          expect(getMarketsSpy).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'bitcoin' }),
          );
        },
        { timeout: 5000 },
      );

      getMarketsSpy.mockRestore();
    });

    it('closes the search overlay when the user presses Cancel', async () => {
      const {
        getByTestId,
        findByText,
        findByPlaceholderText,
        queryByPlaceholderText,
      } = renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      await findByPlaceholderText(SEARCH_PLACEHOLDER);

      fireEvent.press(await findByText(CANCEL_TEXT));

      await waitFor(() => {
        expect(
          queryByPlaceholderText(SEARCH_PLACEHOLDER),
        ).not.toBeOnTheScreen();
      });
    });

    it('hides the clear button after the user clears the typed query', async () => {
      const { getByTestId, findByPlaceholderText, queryByTestId } =
        renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      const searchInput = await findByPlaceholderText(SEARCH_PLACEHOLDER);
      fireEvent.changeText(searchInput, 'ethereum');

      await waitFor(() => {
        expect(
          getByTestId(PredictSearchSelectorsIDs.CLEAR_BUTTON),
        ).toBeOnTheScreen();
      });

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.CLEAR_BUTTON));

      await waitFor(() => {
        expect(
          queryByTestId(PredictSearchSelectorsIDs.CLEAR_BUTTON),
        ).not.toBeOnTheScreen();
      });
    });

    it('shows a "no results" message that includes the typed query when getMarkets returns empty', async () => {
      const { getByTestId, getByText, findByPlaceholderText } =
        renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      const searchInput = await findByPlaceholderText(SEARCH_PLACEHOLDER);
      fireEvent.changeText(searchInput, 'xyznotfound');

      await waitFor(
        () => {
          expect(
            getByText('No results found for "xyznotfound"'),
          ).toBeOnTheScreen();
        },
        { timeout: 2000 },
      );
    });

    it('shows complete market data in the search result card after getMarkets resolves', async () => {
      // Arrange
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );
      getMarketsSpy.mockResolvedValue([MOCK_PREDICT_MARKET]);
      const { getByTestId, findByPlaceholderText, findByTestId } =
        renderPredictFeedView();

      // Act — user opens search and types a query
      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = await findByPlaceholderText(SEARCH_PLACEHOLDER);
      fireEvent.changeText(searchInput, 'bitcoin');

      // Assert — result card contains all significant market fields
      const resultCard = await findByTestId(
        getPredictSearchSelector.resultCard(0),
        {},
        { timeout: 3000 },
      );
      expect(
        within(resultCard).getByText(MOCK_PREDICT_MARKET.title),
      ).toBeOnTheScreen();
      expect(within(resultCard).getByText(/Yes/)).toBeOnTheScreen();
      expect(within(resultCard).getByText(/No/)).toBeOnTheScreen();

      getMarketsSpy.mockRestore();
    });

    it('navigates to market details when the user taps a search result card', async () => {
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );
      getMarketsSpy.mockResolvedValue([MOCK_PREDICT_MARKET]);

      const { getByTestId, findByPlaceholderText, findByTestId } =
        renderPredictFeedViewWithRoutes({
          extraRoutes: [{ name: Routes.PREDICT.ROOT }],
        });

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      const searchInput = await findByPlaceholderText(SEARCH_PLACEHOLDER);
      fireEvent.changeText(searchInput, 'bitcoin');

      const resultCard = await findByTestId(
        getPredictSearchSelector.resultCard(0),
        {},
        { timeout: 3000 },
      );
      fireEvent.press(resultCard);

      expect(
        await findByTestId(`route-${Routes.PREDICT.ROOT}`),
      ).toBeOnTheScreen();

      getMarketsSpy.mockRestore();
    });
  });

  describe('crypto Up/Down consolidated card', () => {
    it('renders one feed card per series and opens details from the live card', async () => {
      const now = Date.now();
      const liveMarket = createCryptoUpDownMarket(
        'btc-live-market',
        new Date(now + 60_000).toISOString(),
      );
      const nextMarket = createCryptoUpDownMarket(
        'btc-next-market',
        new Date(now + 360_000).toISOString(),
      );
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );
      getMarketsSpy.mockImplementation(async (params?: { q?: string }) =>
        params?.q ? [liveMarket, nextMarket] : [],
      );
      const getMarketSeriesSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarketSeries',
      );
      getMarketSeriesSpy.mockResolvedValue([liveMarket, nextMarket]);
      const getCryptoPriceHistorySpy = jest.spyOn(
        Engine.context.PredictController,
        'getCryptoPriceHistory',
      );
      getCryptoPriceHistorySpy.mockResolvedValue([
        { timestamp: 1, value: 69000 },
        { timestamp: 2, value: 69100 },
      ]);

      const {
        getByTestId,
        findAllByText,
        findByPlaceholderText,
        findByTestId,
      } = renderPredictFeedViewWithRoutes({
        overrides: predictUpDownFlagOverrides,
        extraRoutes: [{ name: Routes.PREDICT.ROOT }],
      });

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      fireEvent.changeText(
        await findByPlaceholderText(SEARCH_PLACEHOLDER),
        'btc',
      );

      const searchResult = await findByTestId(
        getPredictSearchSelector.resultCard(0),
        {},
        { timeout: 3000 },
      );
      expect(searchResult).toBeOnTheScreen();
      expect(
        await findByTestId(
          PredictCryptoUpDownMarketCardSelectorsIDs.LIVE_BADGE,
        ),
      ).toBeOnTheScreen();
      expect(await findAllByText('BTC Up or Down - 5 Minutes')).toHaveLength(1);

      fireEvent.press(searchResult);

      expect(
        await findByTestId(`route-${Routes.PREDICT.ROOT}`),
      ).toBeOnTheScreen();

      getMarketsSpy.mockRestore();
      getMarketSeriesSpy.mockRestore();
      getCryptoPriceHistorySpy.mockRestore();
    });
  });

  describe('back navigation', () => {
    it('navigates to the wallet when the user presses back from the root feed', async () => {
      const { getByTestId, findByTestId } = renderPredictFeedViewWithRoutes({
        extraRoutes: [{ name: Routes.WALLET.HOME }],
      });

      await findByTestId(PredictMarketListSelectorsIDs.CONTAINER);

      fireEvent.press(getByTestId(PredictMarketListSelectorsIDs.BACK_BUTTON));

      expect(
        await findByTestId(`route-${Routes.WALLET.HOME}`),
      ).toBeOnTheScreen();
    });
  });

  describe('balance card', () => {
    it('calls getBalance and displays the balance card once the balance resolves', async () => {
      const getBalanceSpy = jest.spyOn(
        Engine.context.PredictController,
        'getBalance',
      );

      const { findByTestId } = renderPredictFeedView();

      expect(
        await findByTestId(PredictBalanceSelectorsIDs.BALANCE_CARD),
      ).toBeOnTheScreen();
      expect(getBalanceSpy).toHaveBeenCalled();

      getBalanceSpy.mockRestore();
    });

    it('calls trackGeoBlockTriggered when the user presses Add Funds while ineligible', async () => {
      const trackGeoBlockSpy = jest.spyOn(
        Engine.context.PredictController,
        'trackGeoBlockTriggered',
      );

      const { findByTestId, findByText } = renderPredictFeedView();

      await findByTestId(PredictBalanceSelectorsIDs.BALANCE_CARD);
      fireEvent.press(await findByText('Add funds'));

      await waitFor(() => {
        expect(trackGeoBlockSpy).toHaveBeenCalledWith(
          expect.objectContaining({ attemptedAction: 'deposit' }),
        );
      });

      trackGeoBlockSpy.mockRestore();
    });
  });

  describe('search error recovery', () => {
    it('shows the offline error state in the search overlay when all market fetch retries fail', async () => {
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );
      getMarketsSpy.mockRejectedValue(new Error('Network error'));

      const { getByTestId, findByPlaceholderText, findByTestId } =
        renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      await findByPlaceholderText(SEARCH_PLACEHOLDER);

      // The hook retries up to 3 times with exponential backoff (~3-5 s total).
      // findByTestId waits until the error state appears after all retries exhaust.
      expect(
        await findByTestId(
          PredictSearchSelectorsIDs.ERROR_STATE,
          {},
          { timeout: 10000 },
        ),
      ).toBeOnTheScreen();

      getMarketsSpy.mockRestore();
    });

    it('calls getMarkets again when the user presses Retry after an error', async () => {
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );
      getMarketsSpy.mockRejectedValue(new Error('Network error'));

      const { getByTestId, findByPlaceholderText, findByTestId, findByText } =
        renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      await findByPlaceholderText(SEARCH_PLACEHOLDER);

      await findByTestId(
        PredictSearchSelectorsIDs.ERROR_STATE,
        {},
        { timeout: 10000 },
      );

      const callCountBeforeRetry = getMarketsSpy.mock.calls.length;

      // Make subsequent calls succeed so the retry completes quickly.
      getMarketsSpy.mockResolvedValue([]);

      fireEvent.press(await findByText('Retry'));

      await waitFor(() => {
        expect(getMarketsSpy.mock.calls.length).toBeGreaterThan(
          callCountBeforeRetry,
        );
      });

      getMarketsSpy.mockRestore();
    });
  });
});
