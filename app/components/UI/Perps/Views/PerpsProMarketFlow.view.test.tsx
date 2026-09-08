/**
 * Perps Pro Market Flow — full scenario component view tests.
 *
 * High-value Pro journeys through real Redux + stream fixtures (not hook
 * mocks): positions filtering/market switch, order cancel wiring, short
 * market place, close-position navigation, and geo-restricted Close all.
 *
 * Close-all Engine confirm and Cancel-all sheet internals are covered by
 * dedicated CloseAll/CancelAll view tests; Share/History and mode-chooser
 * probes were dropped as low-signal overlap.
 */
import '../../../../../tests/component-view/mocks';

import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import type { PriceUpdate } from '@metamask/perps-controller';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import {
  describeForPlatforms,
  itForPlatforms,
} from '../../../../../tests/component-view/platform';
import {
  createBtcMarketForViews,
  createEthMarketForViews,
  createFundedAccountForViews,
  createLimitOrderForViews,
  createLongPositionForViews,
  createShortPositionForViews,
} from '../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { wirePerpsControllerForStore } from '../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import { renderPerpsProMarketView } from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import { clearPendingPerpsCufTraces } from '../utils/perpsCufTrace';
import {
  getPerpsProOrderRowSelector,
  getPerpsProPositionRowSelector,
  PerpsCancelAllOrdersViewSelectorsIDs,
  PerpsCloseAllPositionsViewSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../Perps.testIds';

const TIMEOUT_MS = 5000;
const formIds = PerpsProOrderFormSelectorsIDs;
const panelIds = PerpsProMarketViewSelectorsIDs;

const ethMarket = createEthMarketForViews();
const btcMarket = createBtcMarketForViews();
const ethLong = createLongPositionForViews({
  // Keep entry below live mark ($2500) so useLivePnl shows a clear gain.
  entryPrice: '2400',
  unrealizedPnl: '100',
  returnOnEquity: '0.12',
});
const btcShort = createShortPositionForViews({
  // Short gains when mark ($50000) is below entry.
  entryPrice: '52000',
  unrealizedPnl: '1000',
  returnOnEquity: '0.1',
});
const ethLimitOrder = createLimitOrderForViews({
  timestamp: 1_711_756_800_100,
});
const btcLimitOrder = createLimitOrderForViews({
  orderId: 'pro-order-btc-1',
  symbol: 'BTC',
  side: 'sell',
  size: '0.1',
  originalSize: '0.1',
  remainingSize: '0.1',
  price: '51000',
  timestamp: 1_711_756_800_000,
});

const defaultProPrices: Record<string, PriceUpdate> = {
  ETH: {
    symbol: 'ETH',
    price: '2500',
    markPrice: '2500',
    percentChange24h: '2',
    timestamp: 1,
    isTradable: true,
  },
  BTC: {
    symbol: 'BTC',
    price: '50000',
    markPrice: '50000',
    percentChange24h: '0.2',
    timestamp: 1,
    isTradable: true,
  },
};

let unwirePerpsControllerForStore: (() => void) | undefined;

const renderProMarketScenario = (
  options: Parameters<typeof renderPerpsProMarketView>[0] = {},
) => {
  const result = renderPerpsProMarketView({
    ...options,
    streamOverrides: {
      account: createFundedAccountForViews('10000'),
      marketData: [ethMarket, btcMarket],
      prices: defaultProPrices,
      positions: [ethLong, btcShort],
      orders: [ethLimitOrder, btcLimitOrder],
      ...options.streamOverrides,
    },
    extraRoutes: [
      { name: Routes.PERPS.CLOSE_POSITION },
      ...(options.extraRoutes ?? []),
    ],
  });
  unwirePerpsControllerForStore?.();
  unwirePerpsControllerForStore = wirePerpsControllerForStore(result.store);
  return result;
};

const findPositionsPanel = () =>
  screen.findByTestId(panelIds.POSITIONS_PANEL, {}, { timeout: TIMEOUT_MS });

const openOrdersTab = async () => {
  fireEvent.press(screen.getByTestId(panelIds.POSITIONS_PANEL_TAB_ORDERS));
  return screen.findByTestId(panelIds.ORDERS_LIST, {}, { timeout: TIMEOUT_MS });
};

const applySideFilter = async (side: 'all' | 'long' | 'short') => {
  fireEvent.press(screen.getByTestId(panelIds.POSITIONS_SIDE_FILTER_BUTTON));
  fireEvent.press(
    await screen.findByTestId(
      `${panelIds.POSITIONS_SIDE_FILTER_SHEET}-option-${side}`,
      {},
      { timeout: TIMEOUT_MS },
    ),
  );
};

/**
 * Join fire-and-forget toast/haptic work so mutations cannot finish after Jest
 * tears down the environment (CI --forceExit otherwise hits Platform.OS after
 * teardown via playNotification).
 */
const flushAsyncSideEffects = async (delayMs = 50) => {
  await act(async () => {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  });
};

describeForPlatforms('Perps Pro Market Flow', () => {
  afterEach(async () => {
    // Wake CUF waiters / clear pending spans so stream timers do not outlive
    // the Jest environment and race toast/haptic teardown.
    clearPendingPerpsCufTraces();
    unwirePerpsControllerForStore?.();
    unwirePerpsControllerForStore = undefined;
    await flushAsyncSideEffects();
    cleanup();
  });

  itForPlatforms(
    'trader reviews positions with complete data, filters by side and ticker, then switches market',
    async () => {
      renderProMarketScenario();

      await findPositionsPanel();
      const ethRow = await screen.findByTestId(
        getPerpsProPositionRowSelector('ETH'),
        {},
        { timeout: TIMEOUT_MS },
      );
      const btcRow = await screen.findByTestId(
        getPerpsProPositionRowSelector('BTC'),
        {},
        { timeout: TIMEOUT_MS },
      );

      const ethScope = within(ethRow);
      expect(ethScope.getByText('ETH')).toBeOnTheScreen();
      expect(ethScope.getByText(/3x/)).toBeOnTheScreen();
      expect(
        ethScope.getByTestId(panelIds.POSITION_PNL_TEXT),
      ).toHaveTextContent('+$100.00');
      expect(ethScope.getByText(/\$2,400/)).toBeOnTheScreen();

      const btcScope = within(btcRow);
      expect(btcScope.getByText('BTC')).toBeOnTheScreen();
      expect(btcScope.getByText(/5x/)).toBeOnTheScreen();
      expect(
        btcScope.getByTestId(panelIds.POSITION_PNL_TEXT),
      ).toHaveTextContent('+$1,000.00');
      expect(btcScope.getByText(/\$52,000/)).toBeOnTheScreen();

      await applySideFilter('long');

      expect(
        await screen.findByTestId(getPerpsProPositionRowSelector('ETH')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(getPerpsProPositionRowSelector('BTC')),
      ).not.toBeOnTheScreen();

      await applySideFilter('short');

      expect(
        await screen.findByTestId(getPerpsProPositionRowSelector('BTC')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(getPerpsProPositionRowSelector('ETH')),
      ).not.toBeOnTheScreen();

      await applySideFilter('all');
      fireEvent.press(screen.getByTestId(panelIds.POSITIONS_TICKER_ONLY));

      expect(
        await screen.findByTestId(getPerpsProPositionRowSelector('ETH')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(getPerpsProPositionRowSelector('BTC')),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(panelIds.POSITIONS_TICKER_ONLY));
      expect(screen.getByTestId(panelIds.HEADER_SYMBOL)).toHaveTextContent(
        'Ethereum',
      );
      fireEvent.press(
        within(
          screen.getByTestId(getPerpsProPositionRowSelector('BTC')),
        ).getByText('BTC'),
      );

      await waitFor(
        () => {
          expect(screen.getByTestId(panelIds.HEADER_SYMBOL)).toHaveTextContent(
            'Bitcoin',
          );
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );

  itForPlatforms(
    'trader cancels one open order then cancels the rest from Cancel all',
    async () => {
      const cancelOrder = Engine.context.PerpsController
        .cancelOrder as jest.Mock;
      const cancelOrders = Engine.context.PerpsController
        .cancelOrders as jest.Mock;
      cancelOrder.mockClear();
      cancelOrders.mockClear();

      renderProMarketScenario();
      await findPositionsPanel();
      await openOrdersTab();

      const ethOrderRow = await screen.findByTestId(
        getPerpsProOrderRowSelector('ETH', 0),
        {},
        { timeout: TIMEOUT_MS },
      );
      expect(within(ethOrderRow).getByText('ETH')).toBeOnTheScreen();
      expect(
        await screen.findByTestId(
          getPerpsProOrderRowSelector('BTC', 1),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      fireEvent.press(within(ethOrderRow).getByTestId(panelIds.ORDER_CANCEL));

      await waitFor(
        () => {
          expect(cancelOrder).toHaveBeenCalledWith(
            expect.objectContaining({
              orderId: ethLimitOrder.orderId,
              symbol: 'ETH',
            }),
          );
        },
        { timeout: TIMEOUT_MS },
      );
      await flushAsyncSideEffects();

      fireEvent.press(screen.getByTestId(panelIds.ORDERS_CANCEL_ALL));

      expect(
        await screen.findByTestId(
          PerpsCancelAllOrdersViewSelectorsIDs.SHEET,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            PerpsCancelAllOrdersViewSelectorsIDs.CANCEL_ALL_BUTTON,
          ),
        );
      });

      await waitFor(
        () => {
          expect(cancelOrders).toHaveBeenCalled();
        },
        { timeout: TIMEOUT_MS },
      );
      await flushAsyncSideEffects();
    },
  );

  itForPlatforms(
    'trader sizes a short market order and submits it through Place order',
    async () => {
      const validateOrder = Engine.context.PerpsController
        .validateOrder as jest.Mock;
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      validateOrder.mockClear();
      placeOrder.mockClear();
      validateOrder.mockResolvedValue({ isValid: true });

      const { stream } = renderProMarketScenario({
        streamOverrides: {
          positions: [],
          orders: [],
        },
      });

      // CUF arms before placeOrder resolves, then awaits the positions stream.
      // Deliver the fill on the next macrotask so the confirm race resolves
      // instead of toasting after 1s and leaving a 30s late waiter.
      const filledShort = createShortPositionForViews({
        symbol: 'ETH',
        size: '-0.04',
        entryPrice: '2500',
        liquidationPrice: '2750',
        marginUsed: '100',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        positionValue: '100',
      });
      placeOrder.mockImplementation(async () => {
        setTimeout(() => {
          stream.emitPositions([filledShort]);
        }, 0);
        return { success: true, orderId: 'component-view-order' };
      });

      const sizeInput = await screen.findByTestId(
        formIds.SIZE_INPUT,
        {},
        { timeout: TIMEOUT_MS },
      );
      fireEvent.press(screen.getByTestId(formIds.DIRECTION_SHORT));
      fireEvent.changeText(sizeInput, '100');
      fireEvent(sizeInput, 'blur');

      let finalValidation: Promise<unknown> | undefined;
      await waitFor(
        () => {
          const validationCallIndex = validateOrder.mock.calls.findIndex(
            ([params]) =>
              params.orderType === 'market' && params.isBuy === false,
          );
          expect(validationCallIndex).toBeGreaterThanOrEqual(0);
          finalValidation = validateOrder.mock.results[validationCallIndex]
            ?.value as Promise<unknown>;
        },
        { timeout: TIMEOUT_MS },
      );
      await act(async () => {
        await finalValidation;
      });
      await waitFor(
        () => {
          expect(
            screen.getByTestId(formIds.PLACE_ORDER_BUTTON),
          ).not.toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );

      await act(async () => {
        fireEvent.press(screen.getByTestId(formIds.PLACE_ORDER_BUTTON));
      });

      await waitFor(
        () => {
          expect(placeOrder).toHaveBeenCalledWith(
            expect.objectContaining({
              symbol: 'ETH',
              orderType: 'market',
              isBuy: false,
            }),
          );
        },
        { timeout: TIMEOUT_MS },
      );
      await flushAsyncSideEffects();
    },
  );

  itForPlatforms(
    'trader closes a position from the Pro card and lands on Close position',
    async () => {
      renderProMarketScenario();
      await findPositionsPanel();

      const ethRow = await screen.findByTestId(
        getPerpsProPositionRowSelector('ETH'),
        {},
        { timeout: TIMEOUT_MS },
      );

      fireEvent.press(within(ethRow).getByTestId(panelIds.POSITION_CLOSE));

      expect(
        await screen.findByTestId(
          getRouteProbeTestId(Routes.PERPS.CLOSE_POSITION),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'geo-restricted trader is blocked from Close all and sees the geo sheet',
    async () => {
      renderProMarketScenario({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: false },
            },
          },
        },
      });
      await findPositionsPanel();

      fireEvent.press(
        await screen.findByTestId(
          panelIds.POSITIONS_CLOSE_ALL,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      expect(
        await screen.findByTestId(
          panelIds.GEO_BLOCK_TOOLTIP,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsCloseAllPositionsViewSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen();
    },
  );
});
