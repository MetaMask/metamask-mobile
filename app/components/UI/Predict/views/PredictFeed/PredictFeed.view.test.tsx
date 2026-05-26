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
import {
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import {
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
  PredictCryptoUpDownMarketCardSelectorsIDs,
  PredictFeedSelectorsIDs,
  getPredictMarketListSelector,
  getPredictFeedSelector,
  getPredictSearchSelector,
} from '../../Predict.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { MOCK_PREDICT_MARKET } from '../../../../../../tests/component-view/fixtures/predict';
import { PREDICT_OFFLINE_TEST_IDS } from '../../components/PredictOffline/PredictOffline.testIds';
import { PREDICT_PORTFOLIO_TEST_IDS } from '../../components/PredictPortfolio';
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
const RETRY_TEXT = 'Retry';

const createPredictMarket = ({
  id,
  category,
  title,
  yesPrice,
  noPrice,
  volume,
}: {
  id: string;
  category: PredictMarket['category'];
  title: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
}): PredictMarket => ({
  ...MOCK_PREDICT_MARKET,
  id,
  slug: id,
  title,
  category,
  volume,
  outcomes: [
    {
      ...MOCK_PREDICT_MARKET.outcomes[0],
      id: `${id}-outcome`,
      marketId: id,
      title,
      volume,
      tokens: [
        { id: `${id}-yes`, title: 'Yes', price: yesPrice },
        { id: `${id}-no`, title: 'No', price: noPrice },
      ],
    },
  ],
});

const TRENDING_MARKETS = [
  createPredictMarket({
    id: 'market-btc-100k',
    category: 'trending',
    title: 'Will Bitcoin reach $100k?',
    yesPrice: 0.65,
    noPrice: 0.35,
    volume: 1_000_000,
  }),
  createPredictMarket({
    id: 'market-eth-10k',
    category: 'trending',
    title: 'Will Ethereum reach $10k?',
    yesPrice: 0.42,
    noPrice: 0.58,
    volume: 250_000,
  }),
] as const;

const NEW_MARKET = createPredictMarket({
  id: 'market-new-fed-rate',
  category: 'new',
  title: 'Will the Fed cut rates this month?',
  yesPrice: 0.51,
  noPrice: 0.49,
  volume: 125_000,
});

const layoutPredictFeed = async ({
  findByTestId,
}: Pick<ReturnType<typeof renderPredictFeedView>, 'findByTestId'>) => {
  fireEvent(await findByTestId(PredictFeedSelectorsIDs.HEADER), 'layout', {
    nativeEvent: { layout: { height: 160 } },
  });
  fireEvent(
    await findByTestId(PredictFeedSelectorsIDs.TAB_BAR_CONTAINER),
    'layout',
    {
      nativeEvent: { layout: { height: 48 } },
    },
  );
};

describe('PredictFeed', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    (
      Engine.context.PredictController.getMarkets as jest.Mock
    ).mockResolvedValue({ markets: [], nextCursor: null });
    (
      Engine.context.PredictController.searchMarkets as jest.Mock
    ).mockResolvedValue({ markets: [], totalResults: 0 });
  });

  describe('search interaction', () => {
    it('opens the search overlay when the user presses the search icon', async () => {
      const { getByTestId, findByPlaceholderText } = renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      expect(await findByPlaceholderText(SEARCH_PLACEHOLDER)).toBeOnTheScreen();
    });

    it('calls PredictController.searchMarkets with the typed query after the user searches', async () => {
      const searchMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'searchMarkets',
      );

      const { getByTestId, findByPlaceholderText } = renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      const searchInput = await findByPlaceholderText(SEARCH_PLACEHOLDER);
      fireEvent.changeText(searchInput, 'bitcoin');

      await waitFor(
        () => {
          expect(searchMarketsSpy).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'bitcoin' }),
          );
        },
        { timeout: 5000 },
      );

      searchMarketsSpy.mockRestore();
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

    it('shows complete market data in the search result card after searchMarkets resolves', async () => {
      // Arrange
      const searchMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'searchMarkets',
      );
      searchMarketsSpy.mockResolvedValue({
        markets: [MOCK_PREDICT_MARKET],
        totalResults: 1,
      });
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

      searchMarketsSpy.mockRestore();
    });

    it('navigates to market details when the user taps a search result card', async () => {
      const searchMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'searchMarkets',
      );
      searchMarketsSpy.mockResolvedValue({
        markets: [MOCK_PREDICT_MARKET],
        totalResults: 1,
      });

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

      searchMarketsSpy.mockRestore();
    });
  });

  describe('market feed error recovery', () => {
    it('shows the offline state without market cards when all feed fetch retries fail', async () => {
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );
      getMarketsSpy.mockRejectedValue(new Error('Network error'));

      const { findByTestId, queryByTestId } = renderPredictFeedView();

      await layoutPredictFeed({ findByTestId });

      expect(
        await findByTestId(
          PREDICT_OFFLINE_TEST_IDS.ERROR_STATE,
          {},
          { timeout: 10000 },
        ),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(
          getPredictMarketListSelector.marketCardByCategory('trending', 2),
        ),
      ).not.toBeOnTheScreen();

      getMarketsSpy.mockRestore();
    });

    it('loads market cards when the user retries after a feed error', async () => {
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );
      getMarketsSpy.mockRejectedValue(new Error('Network error'));

      const { findByTestId, findByText, queryByTestId } =
        renderPredictFeedView();

      await layoutPredictFeed({ findByTestId });
      await findByTestId(
        PREDICT_OFFLINE_TEST_IDS.ERROR_STATE,
        {},
        { timeout: 10000 },
      );
      const callCountBeforeRetry = getMarketsSpy.mock.calls.length;
      getMarketsSpy.mockResolvedValue({
        markets: [...TRENDING_MARKETS],
        nextCursor: null,
      });

      fireEvent.press(await findByText(RETRY_TEXT));

      await waitFor(() => {
        expect(getMarketsSpy.mock.calls.length).toBeGreaterThan(
          callCountBeforeRetry,
        );
      });
      expect(
        await findByTestId(
          getPredictMarketListSelector.marketCardByCategory('trending', 1),
        ),
      ).toBeOnTheScreen();
      expect(queryByTestId(PREDICT_OFFLINE_TEST_IDS.ERROR_STATE)).toBeNull();

      getMarketsSpy.mockRestore();
    });
  });

  describe('market feed data', () => {
    it('shows complete market data for every loaded trending market', async () => {
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );
      getMarketsSpy.mockImplementation(({ category }) =>
        Promise.resolve({
          markets: category === 'trending' ? [...TRENDING_MARKETS] : [],
          nextCursor: null,
        }),
      );

      const { findByTestId } = renderPredictFeedView();

      await layoutPredictFeed({ findByTestId });

      const bitcoinCard = await findByTestId(
        getPredictMarketListSelector.marketCardByCategory('trending', 1),
      );
      expect(
        within(bitcoinCard).getByText(TRENDING_MARKETS[0].title),
      ).toBeOnTheScreen();
      expect(within(bitcoinCard).getByText('65%')).toBeOnTheScreen();
      expect(within(bitcoinCard).getByText('Yes')).toBeOnTheScreen();
      expect(within(bitcoinCard).getByText('No')).toBeOnTheScreen();
      expect(within(bitcoinCard).getByText('$1M Vol.')).toBeOnTheScreen();

      const ethereumCard = await findByTestId(
        getPredictMarketListSelector.marketCardByCategory('trending', 2),
      );
      expect(
        within(ethereumCard).getByText(TRENDING_MARKETS[1].title),
      ).toBeOnTheScreen();
      expect(within(ethereumCard).getByText('42%')).toBeOnTheScreen();
      expect(within(ethereumCard).getByText('Yes')).toBeOnTheScreen();
      expect(within(ethereumCard).getByText('No')).toBeOnTheScreen();
      expect(within(ethereumCard).getByText('$250k Vol.')).toBeOnTheScreen();

      getMarketsSpy.mockRestore();
    });

    it('loads the selected category after the user switches tabs', async () => {
      const getMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'getMarkets',
      );
      getMarketsSpy.mockImplementation(({ category }) => {
        if (category === 'trending') {
          return Promise.resolve({
            markets: [...TRENDING_MARKETS],
            nextCursor: null,
          });
        }
        if (category === 'new') {
          return Promise.resolve({ markets: [NEW_MARKET], nextCursor: null });
        }
        return Promise.resolve({ markets: [], nextCursor: null });
      });

      const { findByTestId, getByTestId } = renderPredictFeedView();

      await layoutPredictFeed({ findByTestId });
      await findByTestId(
        getPredictMarketListSelector.marketCardByCategory('trending', 1),
      );

      fireEvent.press(getByTestId(getPredictFeedSelector.tab(2)));

      const newMarketCard = await findByTestId(
        getPredictMarketListSelector.marketCardByCategory('new', 1),
      );
      const newTabPage = getByTestId(getPredictFeedSelector.tabPage('new'));
      const newTabScope = within(newTabPage);

      expect(
        within(newMarketCard).getByText(NEW_MARKET.title),
      ).toBeOnTheScreen();
      expect(
        newTabScope.queryByTestId(
          getPredictMarketListSelector.marketCardByCategory('trending', 1),
        ),
      ).not.toBeOnTheScreen();
      expect(
        newTabScope.queryByTestId(
          getPredictMarketListSelector.marketCardByCategory('new', 2),
        ),
      ).not.toBeOnTheScreen();
      await waitFor(() => {
        expect(getMarketsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'new' }),
        );
      });

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
      const searchMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'searchMarkets',
      );
      searchMarketsSpy.mockResolvedValue({
        markets: [liveMarket, nextMarket],
        totalResults: 2,
      });
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

      searchMarketsSpy.mockRestore();
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

  describe('portfolio module', () => {
    it('calls getBalance and displays the portfolio module once the balance resolves', async () => {
      const getBalanceSpy = jest.spyOn(
        Engine.context.PredictController,
        'getBalance',
      );

      const { findByTestId } = renderPredictFeedView();

      expect(
        await findByTestId(PREDICT_PORTFOLIO_TEST_IDS.MODULE),
      ).toBeOnTheScreen();
      expect(getBalanceSpy).toHaveBeenCalled();

      getBalanceSpy.mockRestore();
    });

    it('uses PredictController balance response in the primary portfolio amount', async () => {
      const getBalanceSpy = jest.spyOn(
        Engine.context.PredictController,
        'getBalance',
      );
      getBalanceSpy.mockResolvedValue(28.16);

      const { findByTestId, findByText } = renderPredictFeedView();

      expect(
        await findByTestId(PREDICT_PORTFOLIO_TEST_IDS.MODULE),
      ).toBeOnTheScreen();
      await waitFor(() => {
        expect(getBalanceSpy).toHaveBeenCalledTimes(1);
      });
      expect(await findByText('$28.16')).toBeOnTheScreen();

      getBalanceSpy.mockRestore();
    });

    it('calls trackGeoBlockTriggered when the user presses Add Funds while ineligible', async () => {
      const trackGeoBlockSpy = jest.spyOn(
        Engine.context.PredictController,
        'trackGeoBlockTriggered',
      );

      const { findByTestId, findByText } = renderPredictFeedViewWithRoutes({
        extraRoutes: [{ name: Routes.PREDICT.MODALS.ROOT }],
      });

      await findByTestId(PREDICT_PORTFOLIO_TEST_IDS.MODULE);
      fireEvent.press(await findByText('Add funds'));

      await waitFor(() => {
        expect(trackGeoBlockSpy).toHaveBeenCalledWith(
          expect.objectContaining({ attemptedAction: 'deposit' }),
        );
      });
      expect(
        await findByTestId(`route-${Routes.PREDICT.MODALS.ROOT}`),
      ).toBeOnTheScreen();

      trackGeoBlockSpy.mockRestore();
    });
  });

  describe('search error recovery', () => {
    it('shows the offline error state in the search overlay when all search retries fail', async () => {
      const searchMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'searchMarkets',
      );
      searchMarketsSpy.mockRejectedValue(new Error('Network error'));

      const { getByTestId, findByPlaceholderText, findByTestId } =
        renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = await findByPlaceholderText(SEARCH_PLACEHOLDER);
      fireEvent.changeText(searchInput, 'bitcoin');

      // The hook retries up to 3 times with exponential backoff (~3-5 s total).
      // findByTestId waits until the error state appears after all retries exhaust.
      expect(
        await findByTestId(
          PREDICT_OFFLINE_TEST_IDS.ERROR_STATE,
          {},
          { timeout: 10000 },
        ),
      ).toBeOnTheScreen();

      searchMarketsSpy.mockRestore();
    });

    it('calls searchMarkets again when the user presses Retry after an error', async () => {
      const searchMarketsSpy = jest.spyOn(
        Engine.context.PredictController,
        'searchMarkets',
      );
      searchMarketsSpy.mockRejectedValue(new Error('Network error'));

      const { getByTestId, findByPlaceholderText, findByTestId, findByText } =
        renderPredictFeedView();

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = await findByPlaceholderText(SEARCH_PLACEHOLDER);
      fireEvent.changeText(searchInput, 'bitcoin');

      await findByTestId(
        PREDICT_OFFLINE_TEST_IDS.ERROR_STATE,
        {},
        { timeout: 10000 },
      );

      const callCountBeforeRetry = searchMarketsSpy.mock.calls.length;

      // Make subsequent calls succeed so the retry completes quickly.
      searchMarketsSpy.mockResolvedValue({ markets: [], totalResults: 0 });

      fireEvent.press(await findByText('Retry'));

      await waitFor(() => {
        expect(searchMarketsSpy.mock.calls.length).toBeGreaterThan(
          callCountBeforeRetry,
        );
      });

      searchMarketsSpy.mockRestore();
    });
  });
});
