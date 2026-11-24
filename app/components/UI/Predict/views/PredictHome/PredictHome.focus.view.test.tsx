/**
 * Component view tests for the Live Now carousel's focus gate (PRED-1535).
 *
 * Home sits at MARKET_LIST in a real native stack with Positions pushed over
 * it. The Engine's market-price subscriptions are tracked as a live set, so
 * each test reads which token ids the app is subscribed to at that moment.
 *
 * Run with: yarn jest -c jest.config.view.js PredictHome.focus.view.test --runInBand --silent --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import Engine from '../../../../../../app/core/Engine';
import { renderPredictHomeWithPositionsRoute } from '../../../../../../tests/component-view/renderers/predictHome';
import {
  buildMockCryptoUpDownMarket,
  buildMockPredictPosition,
  MOCK_PREDICT_LIVE_SPORT_MARKET,
  PREDICT_UP_DOWN_FLAG_OVERRIDES,
} from '../../../../../../tests/component-view/fixtures/predict';
import { deepMerge } from '../../../../../../tests/component-view/stateFixture';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import {
  PredictCryptoUpDownMarketCardSelectorsIDs,
  PredictHomeSelectorsIDs,
  PredictPositionsViewSelectorsIDs,
} from '../../Predict.testIds';
import { PREDICT_PORTFOLIO_TEST_IDS } from './components/PredictPortfolio';
import { BTC_UP_DOWN_5M_SERIES_ID } from '../../constants/btcUpDown5mSeries';

// The live crypto card resolves through two chained queries (market list, then
// series) before it leaves its skeleton, so it needs longer than the default.
const LIVE_CARD_TIMEOUT_MS = 10000;
const SPORT_TOKEN_IDS = ['token-home', 'token-draw', 'token-away'];
const CRYPTO_TOKEN_IDS = ['btc-live-up', 'btc-live-down'];
const POSITION_TOKEN_ID = 'position-token';

const homeWithUpDownOverrides = deepMerge(PREDICT_UP_DOWN_FLAG_OVERRIDES, {
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
});

const createBtcMarket = () =>
  buildMockCryptoUpDownMarket({
    id: 'btc-live',
    endDate: new Date(Date.now() + 60_000).toISOString(),
    seriesId: BTC_UP_DOWN_5M_SERIES_ID,
  });

const OPEN_POSITION = buildMockPredictPosition({
  outcomeTokenId: POSITION_TOKEN_ID,
  marketId: 'position-market',
  title: 'Will the position market resolve yes?',
});

/** Token ids with at least one open Engine price subscription, counted. */
let activeSubscriptions: Map<string, number>;

const trackMarketPriceSubscriptions = () => {
  activeSubscriptions = new Map();
  (
    Engine.context.PredictController.subscribeToMarketPrices as jest.Mock
  ).mockImplementation((tokenIds: string[]) => {
    tokenIds.forEach((id) =>
      activeSubscriptions.set(id, (activeSubscriptions.get(id) ?? 0) + 1),
    );
    let released = false;
    return () => {
      if (released) return;
      released = true;
      tokenIds.forEach((id) => {
        const count = (activeSubscriptions.get(id) ?? 0) - 1;
        if (count > 0) activeSubscriptions.set(id, count);
        else activeSubscriptions.delete(id);
      });
    };
  });
};

// The market socket reports connected as soon as someone listens, as it does
// on a device once the socket is open. That flips the cards' REST polling off
// right after each subscribe, the path that used to fire a second refresh.
const reportMarketSocketConnected = () => {
  (
    Engine.context.PredictController.subscribeToConnectionStatus as jest.Mock
  ).mockImplementation(
    (
      callback: (status: {
        marketConnected: boolean;
        sportsConnected: boolean;
        rtdsConnected: boolean;
      }) => void,
    ) => {
      callback({
        marketConnected: true,
        sportsConnected: false,
        rtdsConnected: false,
      });
      return () => undefined;
    },
  );
};

const isSubscribed = (tokenId: string) => activeSubscriptions.has(tokenId);

const getPricesCallsForCrypto = () =>
  (Engine.context.PredictController.getPrices as jest.Mock).mock.calls.filter(
    ([params]) =>
      params?.queries?.some(
        (query: { outcomeTokenId: string }) =>
          query.outcomeTokenId === CRYPTO_TOKEN_IDS[0],
      ),
  ).length;

const renderHomeWithLiveCarousel = async () => {
  const view = renderPredictHomeWithPositionsRoute({
    overrides: homeWithUpDownOverrides,
  });

  await view.findByTestId(PredictHomeSelectorsIDs.LIVE_NOW_SECTION);
  // Chained async boundary: the market list query, then the series query,
  // then the card swaps its skeleton for the live badge, under the card's
  // one-second clock re-renders.
  await waitFor(
    () =>
      expect(
        view.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.LIVE_BADGE),
      ).toBeOnTheScreen(),
    { timeout: LIVE_CARD_TIMEOUT_MS },
  );
  await waitFor(() => {
    [...SPORT_TOKEN_IDS, ...CRYPTO_TOKEN_IDS].forEach((id) =>
      expect(isSubscribed(id)).toBe(true),
    );
  });

  return view;
};

const openPositions = async (
  view: Awaited<ReturnType<typeof renderHomeWithLiveCarousel>>,
) => {
  fireEvent.press(
    await view.findByTestId(PREDICT_PORTFOLIO_TEST_IDS.ACTION_POSITIONS),
  );
  await view.findByTestId(PredictPositionsViewSelectorsIDs.CONTAINER);
};

const goBackHome = async (
  view: Awaited<ReturnType<typeof renderHomeWithLiveCarousel>>,
) => {
  fireEvent.press(
    await view.findByTestId(PredictPositionsViewSelectorsIDs.BACK_BUTTON),
  );
  await waitFor(() => {
    expect(
      view.queryByTestId(PredictPositionsViewSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });
};

/** Pushes Positions over home and goes back, `rounds` times, waiting each time
 * for the carousel to unsubscribe and then resubscribe. */
const cycleHomeFocus = async (
  view: Awaited<ReturnType<typeof renderHomeWithLiveCarousel>>,
  rounds = 1,
) => {
  for (let round = 1; round <= rounds; round++) {
    await openPositions(view);
    await waitFor(() => expect(isSubscribed(CRYPTO_TOKEN_IDS[0])).toBe(false));
    await goBackHome(view);
    await waitFor(() => expect(isSubscribed(CRYPTO_TOKEN_IDS[0])).toBe(true));
  }
};

describe('PredictHome Live Now focus gate', () => {
  beforeEach(() => {
    // Reset only the Engine mocks this suite reprograms, so their
    // implementations never leak between tests.
    const controller = Engine.context.PredictController;
    [
      controller.subscribeToMarketPrices,
      controller.subscribeToConnectionStatus,
      controller.getPrices,
      controller.getMarkets,
      controller.listMarkets,
      controller.listFilterOptions,
      controller.getMarketSeries,
      controller.getPositions,
    ].forEach((mock) => (mock as jest.Mock).mockReset());
    (controller.getPrices as jest.Mock).mockResolvedValue({
      providerId: '',
      results: [],
    });
    trackMarketPriceSubscriptions();
    reportMarketSocketConnected();
    (
      Engine.context.PredictController.getMarkets as jest.Mock
    ).mockResolvedValue({ markets: [], nextCursor: null });
    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockResolvedValue({
      markets: [MOCK_PREDICT_LIVE_SPORT_MARKET],
      nextCursor: null,
    });
    (
      Engine.context.PredictController.listFilterOptions as jest.Mock
    ).mockResolvedValue([]);
    (
      Engine.context.PredictController.getMarketSeries as jest.Mock
    ).mockImplementation(async ({ seriesId }: { seriesId: string }) =>
      seriesId === BTC_UP_DOWN_5M_SERIES_ID ? [createBtcMarket()] : [],
    );
    (
      Engine.context.PredictController.getPositions as jest.Mock
    ).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('unsubscribes the carousel tokens when Positions covers home', async () => {
    const view = await renderHomeWithLiveCarousel();

    await openPositions(view);

    await waitFor(() => {
      [...SPORT_TOKEN_IDS, ...CRYPTO_TOKEN_IDS].forEach((id) =>
        expect(isSubscribed(id)).toBe(false),
      );
    });
  });

  it('keeps the token a visible Positions screen needs subscribed while home is blurred', async () => {
    (
      Engine.context.PredictController.getPositions as jest.Mock
    ).mockResolvedValue([OPEN_POSITION]);
    const view = await renderHomeWithLiveCarousel();

    await openPositions(view);
    await view.findByText(OPEN_POSITION.title);

    await waitFor(() => {
      expect(isSubscribed(POSITION_TOKEN_ID)).toBe(true);
      CRYPTO_TOKEN_IDS.forEach((id) => expect(isSubscribed(id)).toBe(false));
    });
  });

  it('resubscribes the current carousel tokens when home regains focus', async () => {
    const view = await renderHomeWithLiveCarousel();
    await openPositions(view);
    await waitFor(() => expect(isSubscribed(CRYPTO_TOKEN_IDS[0])).toBe(false));

    await goBackHome(view);

    await waitFor(() => {
      [...SPORT_TOKEN_IDS, ...CRYPTO_TOKEN_IDS].forEach((id) =>
        expect(isSubscribed(id)).toBe(true),
      );
    });
  });

  it('runs one REST refresh when home regains focus', async () => {
    const view = await renderHomeWithLiveCarousel();
    await openPositions(view);
    await waitFor(() => expect(isSubscribed(CRYPTO_TOKEN_IDS[0])).toBe(false));
    const restCallsWhileBlurred = getPricesCallsForCrypto();

    await goBackHome(view);
    // The refresh and the resubscribe run in the same commit, so a duplicate
    // refresh would already be counted once the tokens are subscribed again.
    await waitFor(() => expect(isSubscribed(CRYPTO_TOKEN_IDS[0])).toBe(true));

    expect(getPricesCallsForCrypto()).toBe(restCallsWhileBlurred + 1);
  });

  it('runs one REST refresh per return across repeated blur and focus', async () => {
    const view = await renderHomeWithLiveCarousel();
    const initialRestCalls = getPricesCallsForCrypto();

    await cycleHomeFocus(view, 3);

    expect(getPricesCallsForCrypto()).toBe(initialRestCalls + 3);
  });

  it('holds one subscription per carousel token after repeated blur and focus', async () => {
    const view = await renderHomeWithLiveCarousel();

    await cycleHomeFocus(view, 3);

    expect(activeSubscriptions.get(CRYPTO_TOKEN_IDS[0])).toBe(1);
  });
});
