/**
 * Perps Pro order ticket — combination component view tests.
 *
 * PerpsProMarketView.view.test.tsx already submits the default-side
 * stop-market, stop-limit, take-profit-market, take-profit-limit, a
 * 30-minute TWAP, and one Scale ladder. This file adds the journeys those
 * tests do not walk: configuring the ticket and placing, building a limit
 * order across side and price source, a short stop-market, a reduce-only
 * close, and the Chase / Scale / randomized-TWAP submissions, plus TP/SL
 * hand-off, Add funds, and the panel actions that edit or flip.
 *
 * Everything runs through real Redux + stream fixtures against the mocked
 * PerpsController. The provider seam for these order types is owned by
 * app/components/UI/Perps/integration/*.integration.test.ts.
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
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { Pressable, Text } from 'react-native';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import {
  describeForPlatforms,
  itForPlatforms,
} from '../../../../../tests/component-view/platform';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLimitOrderForViews,
  createLongPositionForViews,
} from '../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { wirePerpsControllerForStore } from '../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import {
  renderPerpsProMarketView,
  type PerpsExtraRoute,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import { resetPerpsChaseOrdersStoreForTests } from '../hooks/usePerpsChaseOrders';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { clearPendingPerpsCufTraces } from '../utils/perpsCufTrace';
import {
  getPerpsLeveragePickerItemTestId,
  getPerpsProOrderFormNoticeTestId,
  getPerpsProOrderRowSelector,
  getPerpsProPositionRowSelector,
  PerpsFlipPositionConfirmSheetSelectorsIDs,
  PerpsLeverageBottomSheetSelectorsIDs,
  PerpsLimitPriceBottomSheetSelectorsIDs,
  PerpsMarginModeBottomSheetSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../Perps.testIds';
import { getPerpsProCompactFieldTestId } from './PerpsProMarketView/components/PerpsProOrderForm/PerpsProCompactInput';

const TIMEOUT_MS = 5000;
const ids = PerpsProOrderFormSelectorsIDs;
const panelIds = PerpsProMarketViewSelectorsIDs;
const sheetIds = PerpsOrderTypeBottomSheetSelectorsIDs;

/** Route probe for the TP/SL hand-off: reports the params the ticket sent and lets the test play the user's confirmation. */
const TPSL_PROBE_IDS = {
  CONTAINER: 'perps-pro-tpsl-probe',
  PARAMS: 'perps-pro-tpsl-probe-params',
  CONFIRM: 'perps-pro-tpsl-probe-confirm',
} as const;
const PROBE_TAKE_PROFIT = '2800';
const PROBE_STOP_LOSS = '2200';

interface TpslProbeParams {
  asset?: string;
  direction?: string;
  orderType?: string;
  leverage?: number;
  amount?: string;
  onConfirm?: (
    position?: unknown,
    takeProfitPrice?: string,
    stopLossPrice?: string,
  ) => Promise<void>;
}

const PerpsTpslRouteProbe = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = (route.params ?? {}) as TpslProbeParams;
  const { onConfirm, ...serializable } = params;

  return (
    <>
      <Text testID={TPSL_PROBE_IDS.CONTAINER}>TPSL</Text>
      <Text testID={TPSL_PROBE_IDS.PARAMS}>{JSON.stringify(serializable)}</Text>
      <Pressable
        testID={TPSL_PROBE_IDS.CONFIRM}
        onPress={() => {
          onConfirm?.(undefined, PROBE_TAKE_PROFIT, PROBE_STOP_LOSS).catch(
            () => undefined,
          );
          navigation.goBack();
        }}
      >
        <Text>Set</Text>
      </Pressable>
    </>
  );
};

const proFlags = (
  flags: Partial<
    Record<
      | 'perpsProTriggeredOrdersEnabled'
      | 'perpsMobileTwap'
      | 'perpsMobileScale'
      | 'perpsMobileChase',
      boolean
    >
  > = {},
) => ({
  perpsProModeEnabled: { enabled: true, minimumVersion: '0.0.0' },
  perpsProTriggeredOrdersEnabled: {
    enabled: flags.perpsProTriggeredOrdersEnabled ?? false,
    minimumVersion: '0.0.0',
  },
  perpsMobileTwap: {
    enabled: flags.perpsMobileTwap ?? false,
    minimumVersion: '0.0.0',
  },
  perpsMobileScale: {
    enabled: flags.perpsMobileScale ?? false,
    minimumVersion: '0.0.0',
  },
  perpsMobileChase: {
    enabled: flags.perpsMobileChase ?? false,
    minimumVersion: '0.0.0',
  },
});

let unwirePerpsControllerForStore: (() => void) | undefined;

interface RenderTicketOptions {
  flags?: Parameters<typeof proFlags>[0];
  activeProvider?: 'hyperliquid' | 'lighter';
  supportedStrategies?: ('twap' | 'scale' | 'chase')[];
  balance?: string;
  positions?: unknown[];
  orders?: unknown[];
  extraRoutes?: PerpsExtraRoute[];
}

const renderTicket = ({
  flags,
  activeProvider = 'hyperliquid',
  supportedStrategies = [],
  balance = '1000',
  positions = [],
  orders = [],
  extraRoutes,
}: RenderTicketOptions = {}) => {
  jest
    .mocked(Engine.context.PerpsController.getOrderCapabilities)
    .mockResolvedValue({
      status: 'ready',
      providerId: activeProvider,
      supportedStrategies,
    });
  // The ticket reads `maxLeverage` from the controller's MarketInfo (a
  // number), which is what bounds the leverage picker.
  jest.mocked(Engine.context.PerpsController.getMarkets).mockResolvedValue([
    {
      name: 'ETH',
      szDecimals: 2,
      maxLeverage: 50,
      marginTableId: 1,
      providerId: activeProvider,
    },
  ]);

  const market = createEthMarketForViews({ providerId: activeProvider });
  const result = renderPerpsProMarketView({
    initialParams: { market },
    streamOverrides: {
      account: createFundedAccountForViews(balance),
      marketData: [market],
      positions,
      orders,
    },
    extraRoutes,
    overrides: {
      engine: {
        backgroundState: {
          PerpsController: { activeProvider },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: proFlags(flags),
          },
        },
      },
    },
  });
  unwirePerpsControllerForStore?.();
  unwirePerpsControllerForStore = wirePerpsControllerForStore(result.store);
  return result;
};

const placeOrderMock = () =>
  jest.mocked(Engine.context.PerpsController.placeOrder);
const validateOrderMock = () =>
  jest.mocked(Engine.context.PerpsController.validateOrder);

const findSizeInput = () =>
  screen.findByTestId(ids.SIZE_INPUT, {}, { timeout: TIMEOUT_MS });

const findPriceInput = (testID: string) =>
  screen.findByTestId(
    testID,
    { includeHiddenElements: true },
    { timeout: TIMEOUT_MS },
  );

const openOrderTypeSheet = async () => {
  fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
  await screen.findByTestId(sheetIds.CONTAINER, {}, { timeout: TIMEOUT_MS });
};

const selectBasicOrderType = async (
  optionTestID: typeof sheetIds.MARKET_OPTION | typeof sheetIds.LIMIT_OPTION,
) => {
  await openOrderTypeSheet();
  fireEvent.press(
    await screen.findByTestId(optionTestID, {}, { timeout: TIMEOUT_MS }),
  );
};

const selectTriggeredOrderType = async (optionTestID: string) => {
  await openOrderTypeSheet();
  fireEvent.press(
    await screen.findByTestId(
      sheetIds.TRIGGERED_TAB,
      {},
      { timeout: TIMEOUT_MS },
    ),
  );
  fireEvent.press(
    await screen.findByTestId(optionTestID, {}, { timeout: TIMEOUT_MS }),
  );
};

const selectAdvancedOrderType = async (optionTestID: string) => {
  await openOrderTypeSheet();
  fireEvent.press(
    await screen.findByTestId(
      sheetIds.ADVANCED_TAB,
      {},
      { timeout: TIMEOUT_MS },
    ),
  );
  fireEvent.press(
    await screen.findByTestId(optionTestID, {}, { timeout: TIMEOUT_MS }),
  );
};

/** Waits for capability discovery so Advanced strategies are selectable. */
const awaitCapabilities = async () => {
  await waitFor(() =>
    expect(
      Engine.context.PerpsController.getOrderCapabilities,
    ).toHaveBeenCalled(),
  );
  await act(async () => Promise.resolve());
};

/**
 * Waits for the final validation pass that matches `predicate`, lets it
 * settle, then returns the enabled Place order button.
 */
const awaitValidatedPlaceOrderButton = async (
  predicate: (
    params: Parameters<typeof Engine.context.PerpsController.validateOrder>[0],
  ) => boolean,
) => {
  const validateOrder = validateOrderMock();
  let finalValidation: Promise<unknown> | undefined;
  await waitFor(
    () => {
      const idx = validateOrder.mock.calls.findIndex(([params]) =>
        predicate(params),
      );
      expect(idx).toBeGreaterThanOrEqual(0);
      finalValidation = validateOrder.mock.results[idx]
        ?.value as Promise<unknown>;
    },
    { timeout: TIMEOUT_MS },
  );
  await act(async () => {
    await finalValidation;
  });
  const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
  await waitFor(() => expect(placeOrderButton).toBeEnabled(), {
    timeout: TIMEOUT_MS,
  });
  return placeOrderButton;
};

const awaitEnabledPlaceOrderButton = async () => {
  const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
  await waitFor(() => expect(placeOrderButton).toBeEnabled(), {
    timeout: TIMEOUT_MS,
  });
  return placeOrderButton;
};

const expectPlaceOrderCalledWith = async (expected: Record<string, unknown>) =>
  waitFor(
    () =>
      expect(placeOrderMock()).toHaveBeenCalledWith(
        expect.objectContaining(expected),
      ),
    { timeout: TIMEOUT_MS },
  );

/**
 * Join fire-and-forget toast/haptic work so mutations cannot finish after Jest
 * tears down the environment.
 */
const flushAsyncSideEffects = async (delayMs = 50) => {
  await act(async () => {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  });
};

describeForPlatforms('Perps Pro order ticket combinations', () => {
  let connectionReadySpy: jest.SpyInstance;
  let connectionSubscriptionSpy: jest.SpyInstance;

  beforeEach(() => {
    // Chase preflight re-reads live sessions through the shared Chase store,
    // which only issues controller reads once the user context is ready.
    resetPerpsChaseOrdersStoreForTests();
    PerpsCacheInvalidator._clearAllSubscribers();
    connectionReadySpy = jest
      .spyOn(PerpsConnectionManager, 'isSelectedUserContextReady')
      .mockReturnValue(true);
    connectionSubscriptionSpy = jest
      .spyOn(PerpsConnectionManager, 'subscribeToInitializedUserContext')
      .mockImplementation(() => () => undefined);
    validateOrderMock().mockReset().mockResolvedValue({ isValid: true });
    placeOrderMock()
      .mockReset()
      .mockResolvedValue({ success: true, orderId: 'component-view-order' });
    jest
      .mocked(Engine.context.PerpsController.editOrder)
      .mockReset()
      .mockResolvedValue({ success: true, orderId: 'component-view-edit' });
    jest
      .mocked(Engine.context.PerpsController.flipPosition)
      .mockReset()
      .mockResolvedValue({ success: true, orderId: 'component-view-flip' });
    jest
      .mocked(Engine.context.PerpsController.updatePositionTPSL)
      .mockReset()
      .mockResolvedValue({ success: true });
    jest
      .mocked(Engine.context.PerpsController.depositWithConfirmation)
      .mockReset()
      .mockResolvedValue({
        result: Promise.resolve('0xcomponent-view-deposit'),
      });
  });

  afterEach(async () => {
    clearPendingPerpsCufTraces();
    unwirePerpsControllerForStore?.();
    unwirePerpsControllerForStore = undefined;
    await flushAsyncSideEffects();
    cleanup();
    connectionReadySpy.mockRestore();
    connectionSubscriptionSpy.mockRestore();
    resetPerpsChaseOrdersStoreForTests();
    PerpsCacheInvalidator._clearAllSubscribers();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Ticket setup, then an order
  // ─────────────────────────────────────────────────────────────────────────

  itForPlatforms(
    'sets leverage and confirms isolated margin, then places a market long',
    async () => {
      renderTicket();
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');
      fireEvent(sizeInput, 'blur');
      await awaitEnabledPlaceOrderButton();
      const marginBefore = screen.getByTestId(ids.SUMMARY_MARGIN).props
        .children;

      fireEvent.press(screen.getByTestId(ids.LEVERAGE_BUTTON));
      fireEvent.press(
        await screen.findByTestId(
          getPerpsLeveragePickerItemTestId(20),
          {},
          { timeout: TIMEOUT_MS },
        ),
      );
      fireEvent.press(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId(PerpsLeverageBottomSheetSelectorsIDs.PICKER),
        ).not.toBeOnTheScreen();
        expect(screen.getByTestId(ids.LEVERAGE_BUTTON)).toHaveTextContent(
          '20x',
        );
      });
      // Same $100 notional at 20x needs less margin than the default.
      await waitFor(() =>
        expect(screen.getByTestId(ids.SUMMARY_MARGIN).props.children).not.toBe(
          marginBefore,
        ),
      );

      fireEvent.press(screen.getByTestId(ids.MARGIN_MODE_BUTTON));
      const marginSheet = await screen.findByTestId(
        PerpsMarginModeBottomSheetSelectorsIDs.CONTAINER,
        {},
        { timeout: TIMEOUT_MS },
      );
      expect(
        within(marginSheet).getByTestId(
          PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION,
        ),
      ).toBeDisabled();
      fireEvent.press(
        within(marginSheet).getByTestId(
          PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION,
        ),
      );
      await waitFor(() =>
        expect(
          screen.queryByTestId(
            PerpsMarginModeBottomSheetSelectorsIDs.CONTAINER,
          ),
        ).not.toBeOnTheScreen(),
      );

      const placeOrderButton = await awaitValidatedPlaceOrderButton(
        (params) =>
          params.orderType === 'market' &&
          params.isBuy === true &&
          params.leverage === 20,
      );
      fireEvent.press(placeOrderButton);

      await expectPlaceOrderCalledWith({
        symbol: 'ETH',
        orderType: 'market',
        isBuy: true,
        leverage: 20,
        reduceOnly: false,
      });
      expect(placeOrderMock().mock.calls[0][0]).not.toHaveProperty(
        'triggerPrice',
      );
    },
  );

  itForPlatforms(
    'types a limit price, switches to short, replaces it with Mid, and submits',
    async () => {
      renderTicket();
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');

      await selectBasicOrderType(sheetIds.LIMIT_OPTION);
      const limitInput = await findPriceInput(ids.LIMIT_PRICE_INPUT);
      fireEvent.changeText(limitInput, '2400');
      await waitFor(() =>
        expect(limitInput.props.value).toMatch(/^2,?400(\.0+)?$/u),
      );

      fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));
      fireEvent.press(screen.getByTestId(ids.MID_PRICE_BUTTON));
      // Mid replaces the typed price with the live mark ($2,500). Re-query:
      // switching side can remount the field.
      const shortLimitInput = await findPriceInput(ids.LIMIT_PRICE_INPUT);
      await waitFor(() =>
        expect(shortLimitInput.props.value).toMatch(/^2,?500(\.0+)?$/u),
      );
      fireEvent(shortLimitInput, 'blur');
      const placeOrderButton = await awaitValidatedPlaceOrderButton(
        (params) =>
          params.orderType === 'limit' &&
          params.isBuy === false &&
          /^2500(\.0+)?$/u.test(String(params.price)),
      );
      fireEvent.press(placeOrderButton);

      await expectPlaceOrderCalledWith({
        symbol: 'ETH',
        orderType: 'limit',
        isBuy: false,
        price: expect.stringMatching(/^2500(\.0+)?$/u),
      });
    },
  );

  itForPlatforms(
    'submits a short stop-market with a trigger above mid',
    async () => {
      renderTicket({ flags: { perpsProTriggeredOrdersEnabled: true } });
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');
      fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));

      await selectTriggeredOrderType(sheetIds.STOP_MARKET_OPTION);
      const triggerInput = await findPriceInput(ids.TRIGGER_PRICE_INPUT);
      fireEvent.changeText(triggerInput, '2600');
      fireEvent(triggerInput, 'blur');
      const placeOrderButton = await awaitValidatedPlaceOrderButton(
        (params) =>
          params.orderType === 'stop_market' &&
          params.isBuy === false &&
          params.triggerPrice === '2600',
      );
      fireEvent.press(placeOrderButton);

      await expectPlaceOrderCalledWith({
        symbol: 'ETH',
        orderType: 'stop_market',
        isBuy: false,
        triggerPrice: '2600',
      });
      expect(placeOrderMock().mock.calls[0][0]).not.toHaveProperty('price');
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Reduce-only × order type
  // ─────────────────────────────────────────────────────────────────────────

  itForPlatforms(
    'closes an open long reduce-only, then places the close as a limit',
    async () => {
      renderTicket({
        balance: '100000',
        positions: [createLongPositionForViews({ size: '1' })],
      });
      const sizeInput = await findSizeInput();
      fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));
      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));
      fireEvent.changeText(sizeInput, '500');
      fireEvent(sizeInput, 'blur');

      // Reduce-only hides TP/SL (a closing order cannot attach new triggers)
      // and raises no notice while the size still fits the position.
      await waitFor(() => {
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsProOrderFormNoticeTestId('reduce-only')),
        ).not.toBeOnTheScreen();
      });

      await selectBasicOrderType(sheetIds.LIMIT_OPTION);
      const limitInput = await findPriceInput(ids.LIMIT_PRICE_INPUT);
      fireEvent.changeText(limitInput, '2700');
      fireEvent(limitInput, 'blur');
      // Switching to a limit must keep the close constraints.
      expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
      const placeOrderButton = await awaitValidatedPlaceOrderButton(
        (params) =>
          params.orderType === 'limit' &&
          params.isBuy === false &&
          params.reduceOnly === true &&
          params.price === '2700',
      );
      fireEvent.press(placeOrderButton);

      await expectPlaceOrderCalledWith({
        symbol: 'ETH',
        orderType: 'limit',
        isBuy: false,
        reduceOnly: true,
        price: '2700',
      });
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Advanced strategies on the short side / with modifiers
  // ─────────────────────────────────────────────────────────────────────────

  itForPlatforms(
    'submits a Chase order with the typed USD max distance',
    async () => {
      renderTicket({
        flags: { perpsMobileChase: true },
        supportedStrategies: ['chase'],
      });
      const sizeInput = await findSizeInput();
      await awaitCapabilities();
      fireEvent.changeText(sizeInput, '30');

      await selectAdvancedOrderType(sheetIds.CHASE_OPTION);
      expect(await screen.findByTestId(ids.CHASE_FORM)).toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(
          getPerpsProCompactFieldTestId(ids.CHASE_MAX_DISTANCE_INPUT),
        ),
      );
      fireEvent.changeText(
        screen.getByTestId(ids.CHASE_MAX_DISTANCE_INPUT),
        '10',
      );
      const placeOrderButton = await awaitEnabledPlaceOrderButton();
      fireEvent.press(placeOrderButton);

      await expectPlaceOrderCalledWith({
        symbol: 'ETH',
        orderType: 'chase',
        isBuy: true,
        providerId: 'hyperliquid',
      });
      // $10 of distance on a $2,500 mark is 40 bps.
      const chaseParams = placeOrderMock().mock.calls[0][0] as {
        chaseMaxDistanceBps?: number;
      };
      expect(chaseParams.chaseMaxDistanceBps).toBeCloseTo(40, 5);
    },
  );

  itForPlatforms(
    'submits a short Scale ladder with the price range reversed for the sell side',
    async () => {
      renderTicket({
        flags: {
          perpsProTriggeredOrdersEnabled: true,
          perpsMobileScale: true,
        },
        supportedStrategies: ['scale'],
      });
      const sizeInput = await findSizeInput();
      await awaitCapabilities();
      fireEvent.changeText(sizeInput, '100');
      fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));

      await selectAdvancedOrderType(sheetIds.SCALE_OPTION);
      fireEvent.press(
        screen.getByTestId(
          getPerpsProCompactFieldTestId(ids.SCALE_START_PRICE),
        ),
      );
      fireEvent.changeText(screen.getByTestId(ids.SCALE_START_PRICE), '2600');
      fireEvent.press(
        screen.getByTestId(getPerpsProCompactFieldTestId(ids.SCALE_END_PRICE)),
      );
      fireEvent.changeText(screen.getByTestId(ids.SCALE_END_PRICE), '3000');
      fireEvent.press(
        screen.getByTestId(
          getPerpsProCompactFieldTestId(ids.SCALE_TOTAL_ORDERS),
        ),
      );
      fireEvent.changeText(screen.getByTestId(ids.SCALE_TOTAL_ORDERS), '4');
      const placeOrderButton = await awaitEnabledPlaceOrderButton();
      fireEvent.press(placeOrderButton);

      await expectPlaceOrderCalledWith({
        symbol: 'ETH',
        orderType: 'scale',
        isBuy: false,
        scaleMinPrice: '2600',
        scaleMaxPrice: '3000',
        scaleNumOrders: 4,
      });
    },
  );

  itForPlatforms(
    'submits a short randomized TWAP with the default duration',
    async () => {
      renderTicket({
        flags: { perpsMobileTwap: true },
        supportedStrategies: ['twap'],
      });
      const sizeInput = await findSizeInput();
      await awaitCapabilities();
      fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));

      await selectAdvancedOrderType(sheetIds.TWAP_OPTION);
      await screen.findByTestId(ids.TWAP_DURATION_SECTION);
      fireEvent.changeText(sizeInput, '100');
      fireEvent.press(screen.getByTestId(ids.TWAP_RANDOMIZE));
      await waitFor(() =>
        expect(screen.getByTestId(ids.TWAP_RANDOMIZE)).toBeChecked(),
      );
      const placeOrderButton = await awaitEnabledPlaceOrderButton();
      fireEvent.press(placeOrderButton);

      await expectPlaceOrderCalledWith({
        symbol: 'ETH',
        orderType: 'twap',
        isBuy: false,
        twapDuration: 30,
        twapRandomize: true,
      });
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Ticket hand-offs: TP/SL confirmation and Add funds
  // ─────────────────────────────────────────────────────────────────────────

  itForPlatforms(
    'hands the ticket to TP/SL and attaches the confirmed triggers after the market entry',
    async () => {
      const updatePositionTPSL = jest.mocked(
        Engine.context.PerpsController.updatePositionTPSL,
      );
      renderTicket({
        extraRoutes: [
          { name: Routes.PERPS.TPSL, Component: PerpsTpslRouteProbe },
        ],
      });
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');
      fireEvent(sizeInput, 'blur');
      await awaitEnabledPlaceOrderButton();

      fireEvent.press(screen.getByTestId(ids.TPSL));
      const probeParams = await screen.findByTestId(
        TPSL_PROBE_IDS.PARAMS,
        {},
        { timeout: TIMEOUT_MS },
      );

      const paramsJson = probeParams.props.children as string;
      expect(JSON.parse(paramsJson)).toEqual(
        expect.objectContaining({
          asset: 'ETH',
          direction: 'long',
          orderType: 'market',
          amount: '100',
        }),
      );
      fireEvent.press(screen.getByTestId(TPSL_PROBE_IDS.CONFIRM));
      await waitFor(() =>
        expect(
          screen.queryByTestId(TPSL_PROBE_IDS.CONTAINER),
        ).not.toBeOnTheScreen(),
      );
      const placeOrderButton = await awaitEnabledPlaceOrderButton();
      fireEvent.press(placeOrderButton);

      // With no open ETH position, a market entry cannot carry TP/SL on the
      // order itself: the ticket opens the position first and then attaches
      // the confirmed triggers to it.
      await expectPlaceOrderCalledWith({
        symbol: 'ETH',
        orderType: 'market',
        isBuy: true,
      });
      expect(placeOrderMock().mock.calls[0][0]).not.toHaveProperty(
        'takeProfitPrice',
      );
      await waitFor(
        () =>
          expect(updatePositionTPSL).toHaveBeenCalledWith({
            symbol: 'ETH',
            takeProfitPrice: PROBE_TAKE_PROFIT,
            stopLossPrice: PROBE_STOP_LOSS,
          }),
        { timeout: TIMEOUT_MS },
      );
    },
  );

  itForPlatforms(
    'starts the deposit flow from the ticket Add funds action',
    async () => {
      const depositWithConfirmation = jest.mocked(
        Engine.context.PerpsController.depositWithConfirmation,
      );
      renderTicket();
      await findSizeInput();

      fireEvent.press(
        await screen.findByTestId(
          ids.ADD_FUNDS_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      // The ticket reuses the home deposit flow: a bare deposit prep with no
      // preset amount and no order attached.
      await waitFor(
        () =>
          expect(depositWithConfirmation).toHaveBeenCalledWith({
            amount: undefined,
            placeOrder: false,
          }),
        { timeout: TIMEOUT_MS },
      );
      expect(depositWithConfirmation).toHaveBeenCalledTimes(1);
      expect(placeOrderMock()).not.toHaveBeenCalled();
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Panel actions on existing orders / positions
  // ─────────────────────────────────────────────────────────────────────────

  itForPlatforms(
    'edits an open limit order price from the Pro orders panel',
    async () => {
      const editOrder = jest.mocked(Engine.context.PerpsController.editOrder);
      const restingOrder = createLimitOrderForViews({ price: '2400' });
      renderTicket({ orders: [restingOrder] });
      await screen.findByTestId(
        panelIds.POSITIONS_PANEL,
        {},
        {
          timeout: TIMEOUT_MS,
        },
      );

      fireEvent.press(screen.getByTestId(panelIds.POSITIONS_PANEL_TAB_ORDERS));
      const orderRow = await screen.findByTestId(
        getPerpsProOrderRowSelector('ETH', 0),
        {},
        { timeout: TIMEOUT_MS },
      );
      fireEvent.press(within(orderRow).getByTestId(panelIds.ORDER_PRICE_EDIT));
      await screen.findByTestId(
        PerpsLimitPriceBottomSheetSelectorsIDs.PRICE_DISPLAY,
        {},
        { timeout: TIMEOUT_MS },
      );
      // The sheet opens on the resting price before any preset is applied.
      expect(screen.getByDisplayValue(/2,?400/u)).toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID),
      );
      await waitFor(() =>
        expect(screen.getByDisplayValue(/2,?500/u)).toBeOnTheScreen(),
      );
      fireEvent.press(
        screen.getByTestId(
          PerpsLimitPriceBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        ),
      );

      await waitFor(
        () =>
          expect(editOrder).toHaveBeenCalledWith(
            expect.objectContaining({
              orderId: restingOrder.orderId,
              newOrder: expect.objectContaining({
                symbol: 'ETH',
                orderType: 'limit',
                price: expect.stringMatching(/^2500(\.0+)?$/u),
              }),
            }),
          ),
        { timeout: TIMEOUT_MS },
      );
      await waitFor(() =>
        expect(
          screen.queryByTestId(
            PerpsLimitPriceBottomSheetSelectorsIDs.PRICE_DISPLAY,
          ),
        ).not.toBeOnTheScreen(),
      );
      expect(
        screen.getByTestId(getPerpsProOrderRowSelector('ETH', 0)),
      ).toBeOnTheScreen();
    },
  );

  itForPlatforms(
    'flips an open long from the Pro position card after confirming the sheet',
    async () => {
      const flipPosition = jest.mocked(
        Engine.context.PerpsController.flipPosition,
      );
      renderTicket({
        balance: '10000',
        positions: [createLongPositionForViews({ size: '1' })],
      });
      const positionRow = await screen.findByTestId(
        getPerpsProPositionRowSelector('ETH'),
        {},
        { timeout: TIMEOUT_MS },
      );

      fireEvent.press(
        within(positionRow).getByTestId(panelIds.POSITION_REVERSE),
      );
      const flipButton = await screen.findByTestId(
        PerpsFlipPositionConfirmSheetSelectorsIDs.FLIP_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      );
      await waitFor(() => expect(flipButton).toBeEnabled(), {
        timeout: TIMEOUT_MS,
      });
      fireEvent.press(flipButton);

      await waitFor(
        () =>
          expect(flipPosition).toHaveBeenCalledWith(
            expect.objectContaining({
              position: expect.objectContaining({ symbol: 'ETH', size: '1' }),
            }),
          ),
        { timeout: TIMEOUT_MS },
      );
      await waitFor(() =>
        expect(
          screen.queryByTestId(PerpsFlipPositionConfirmSheetSelectorsIDs.SHEET),
        ).not.toBeOnTheScreen(),
      );
    },
  );
});
