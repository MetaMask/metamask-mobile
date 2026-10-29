/**
 * Component view tests for PerpsOrderView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { Text } from 'react-native';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {
  CandlePeriod,
  PERPS_ERROR_CODES,
  PERPS_EVENT_VALUE,
  type CandleData,
  type PriceUpdate,
  type OrderBookData,
  type OrderBookLevel,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultPositionForViews,
  renderPerpsOrderView,
  type PerpsExtraRoute,
  type PerpsStreamOverrides,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsLimitPriceBottomSheetSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
  PerpsFeeDiscountLabelSelectorsIDs,
  PerpsBottomSheetTooltipSelectorsIDs,
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsTradeSheetSelectorsIDs,
} from '../../Perps.testIds';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  formatPercentage,
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { resetPerpsCufTraceForTests } from '../../utils/perpsCufTrace';
import { MembershipVipBadgeSelectorsIDs } from '../../../shared/MembershipVipBadge/MembershipVipBadge';

const TIMEOUT_MS = 5000;

const GRANT_FEE_QUOTE = {
  feeRate: 0.0007,
  feeAmount: 0.7,
  protocolFeeRate: 0.00045,
  protocolFeeAmount: 0.45,
  metamaskFeeRate: 0.00025,
  metamaskFeeAmount: 0.25,
  chargesMetamaskBuilderFee: true,
  feeSource: 'grant',
  metamaskFeeDiscountBips: 7500,
  undiscountedMetamaskFeeRate: 0.001,
} as const;

const account = createFundedAccountForViews('1000');
const accountWithBalance = createFundedAccountForViews;
const ethMarket = createEthMarketForViews();

const eligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: true,
        isFirstTimeUser: { mainnet: false, testnet: false },
      },
    },
  },
};

const marketDetailsRoute: PerpsExtraRoute = {
  name: Routes.PERPS.MARKET_DETAILS,
  mount: 'perps-root',
};

const crossMarginWarningRoute: PerpsExtraRoute = {
  name: Routes.PERPS.MODALS.ROOT,
};

const emitEthPrice = (
  stream: { emitPrices: (prices: Record<string, PriceUpdate>) => void },
  percentChange24h = '2',
  price = '2500',
) => {
  act(() => {
    stream.emitPrices({
      ETH: {
        symbol: 'ETH',
        price,
        markPrice: price,
        percentChange24h,
        timestamp: Date.now(),
        isTradable: true,
      },
    });
  });
};

const waitForDeferredOrderData = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
};

const waitForEnabledPlaceOrderButton = async (
  testId: string = PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
) => {
  await waitFor(
    () => {
      expect(screen.getByTestId(testId)).not.toBeDisabled();
    },
    { timeout: TIMEOUT_MS },
  );
  return screen.getByTestId(testId);
};

describe('PerpsOrderView', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  beforeAll(() => {
    global.requestAnimationFrame = jest.fn((callback) => {
      setTimeout(() => callback(Date.now()), 0);
      return 1;
    });
  });

  afterAll(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Engine.context.PerpsController.updatePositionTPSL)
      .mockReset()
      .mockResolvedValue({ success: true });
    jest
      .mocked(Engine.context.PerpsController.subscribeToOrderBook)
      .mockReset();
    jest
      .mocked(Engine.context.PerpsController.subscribeToOrderBook)
      .mockImplementation(() => () => undefined);
    (Engine.context.PerpsController.placeOrder as jest.Mock)
      .mockReset()
      .mockResolvedValue({
        success: true,
        orderId: 'component-view-order',
      });
    jest
      .mocked(Engine.context.PerpsController.getAccountSupport)
      .mockReset()
      .mockResolvedValue({ isSupported: true });
    // Place-order confirmation waits on a module-level resolver. A prior case
    // that leaves that waiter pending blocks the next submit, so the TP/SL
    // error toast never replaces "Order submitted".
    resetPerpsCufTraceForTests();
    (
      Engine.context.PerpsController.calculateFees as jest.Mock
    ).mockResolvedValue({});
  });

  afterEach(async () => {
    await act(async () => {
      cleanup();
    });
  });

  it('submits a market long after the trader reviews the calculated order fees and details', async () => {
    const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
    const calculateFees = Engine.context.PerpsController
      .calculateFees as jest.Mock;
    calculateFees.mockResolvedValue({
      feeRate: 0.0005,
      feeAmount: 0.06,
      protocolFeeRate: 0.00045,
      metamaskFeeRate: 0.00005,
    });
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '120',
        leverage: 4,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
      extraRoutes: [marketDetailsRoute],
    });

    expect(
      await screen.findByTestId(
        PerpsOrderHeaderSelectorsIDs.HEADER,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    expect(
      await screen.findByTestId(PerpsOrderViewSelectorsIDs.LEVERAGE_ROW),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderViewSelectorsIDs.MARGIN_VALUE),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(calculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: '120',
        symbol: 'ETH',
      });
      expect(
        screen.getByTestId(PerpsOrderViewSelectorsIDs.FEES_VALUE),
      ).toHaveTextContent('$0.06');
    });

    const placeOrderButton = await waitForEnabledPlaceOrderButton();
    await act(async () => {
      fireEvent.press(placeOrderButton);
    });

    await waitFor(() => {
      expect(placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH',
          isBuy: true,
          orderType: 'market',
          leverage: 4,
          usdAmount: '120',
        }),
      );
    });
    await waitFor(
      () => {
        expect(
          Engine.context.PerpsController.clearPendingTradeConfiguration,
        ).toHaveBeenCalledWith('ETH');
      },
      { timeout: TIMEOUT_MS },
    );
    await waitForDeferredOrderData();
  });

  it('blocks an unsupported full-screen order and dismisses the explanation', async () => {
    const getAccountSupport = jest.mocked(
      Engine.context.PerpsController.getAccountSupport,
    );
    const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
    getAccountSupport.mockResolvedValue({
      isSupported: false,
      reason: 'multi_sig_account',
    });
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '120',
        leverage: 4,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });
    await waitForDeferredOrderData();
    emitEthPrice(stream);
    const placeOrderButton = await waitForEnabledPlaceOrderButton();

    await act(async () => {
      fireEvent.press(placeOrderButton);
    });

    expect(
      await screen.findByText(
        strings('perps.tooltips.account_not_supported.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.tooltips.account_not_supported.content')),
    ).toBeOnTheScreen();
    expect(placeOrder).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByTestId(PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON),
    );

    await waitFor(() => {
      expect(
        screen.queryByText(
          strings('perps.tooltips.account_not_supported.title'),
        ),
      ).not.toBeOnTheScreen();
    });
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('shows and dismisses the unsupported-account explanation in the Trade sheet', async () => {
    const getAccountSupport = jest.mocked(
      Engine.context.PerpsController.getAccountSupport,
    );
    const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
    getAccountSupport.mockResolvedValue({
      isSupported: false,
      reason: 'multi_sig_account',
    });
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '120',
        leverage: 4,
        useBottomSheet: true,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });
    await waitForDeferredOrderData();
    emitEthPrice(stream);
    const placeOrderButton = await waitForEnabledPlaceOrderButton(
      PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON,
    );

    await act(async () => {
      fireEvent.press(placeOrderButton);
    });

    expect(
      await screen.findByText(
        strings('perps.tooltips.account_not_supported.title'),
      ),
    ).toBeOnTheScreen();
    expect(placeOrder).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.INFO_GOT_IT_BUTTON),
    );

    await waitFor(() => {
      expect(
        screen.queryByText(
          strings('perps.tooltips.account_not_supported.title'),
        ),
      ).not.toBeOnTheScreen();
    });
    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
    ).toBeOnTheScreen();
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('abandons a Trade sheet submission when its account-support context becomes stale', async () => {
    const getAccountSupport = jest.mocked(
      Engine.context.PerpsController.getAccountSupport,
    );
    const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
    let resolveAccountSupport: (
      result: Awaited<ReturnType<typeof getAccountSupport>>,
    ) => void = () => undefined;
    const pendingAccountSupport = new Promise<
      Awaited<ReturnType<typeof getAccountSupport>>
    >((resolve) => {
      resolveAccountSupport = resolve;
    });
    getAccountSupport
      .mockResolvedValueOnce({ isSupported: true })
      .mockReturnValueOnce(pendingAccountSupport);
    const { stream, store } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '120',
        leverage: 4,
        useBottomSheet: true,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });
    await waitForDeferredOrderData();
    emitEthPrice(stream);
    const submitButton = await waitForEnabledPlaceOrderButton(
      PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON,
    );

    fireEvent.press(submitButton);
    await waitFor(() => expect(getAccountSupport).toHaveBeenCalledTimes(2));
    const currentPerpsState =
      store.getState().engine.backgroundState.PerpsController;
    const engineWithState = Engine as unknown as {
      state: Record<string, unknown>;
    };
    act(() => {
      engineWithState.state = {
        ...engineWithState.state,
        PerpsController: {
          ...currentPerpsState,
          isTestnet: true,
        },
      };
      store.dispatch(updateBgState({ key: 'PerpsController' }));
    });
    engineWithState.state = {
      ...engineWithState.state,
      PerpsController: currentPerpsState,
    };
    await act(async () => {
      resolveAccountSupport({
        isSupported: false,
        reason: 'multi_sig_account',
      });
      await pendingAccountSupport;
    });

    expect(placeOrder).not.toHaveBeenCalled();
    expect(
      screen.queryByText(strings('perps.tooltips.account_not_supported.title')),
    ).not.toBeOnTheScreen();
  });

  it('shows promotional pricing when Core returns a grant fee quote', async () => {
    const calculateFees = Engine.context.PerpsController
      .calculateFees as jest.Mock;
    calculateFees.mockResolvedValue(GRANT_FEE_QUOTE);
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '1000',
        leverage: 4,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });

    await screen.findByTestId(
      PerpsOrderHeaderSelectorsIDs.HEADER,
      {},
      { timeout: TIMEOUT_MS },
    );
    await waitForDeferredOrderData();
    emitEthPrice(stream);

    expect(
      await screen.findByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.tooltips.fees.promotional_discount')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderViewSelectorsIDs.ORIGINAL_FEES_VALUE),
    ).toHaveTextContent('$1.45');
    expect(
      screen.queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  it.each([
    [
      PERPS_ERROR_CODES.PROVIDER_LIFECYCLE_STALE,
      'perps.errors.clientReinitializing',
    ],
    [undefined, 'perps.errors.unknownError'],
  ])(
    'shows the translated TP/SL failure %s after submitting a market order',
    async (error, messageKey) => {
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      const updatePositionTPSL = Engine.context.PerpsController
        .updatePositionTPSL as jest.Mock;
      // Once is consumed by any earlier call in the same case, and the
      // following call then resolves success and never shows the error toast.
      updatePositionTPSL.mockResolvedValue({ success: false, error });
      const { stream } = renderPerpsOrderView({
        includeToasts: true,
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                ...eligibleOverrides.engine.backgroundState.PerpsController,
                tradeConfigurations: {
                  mainnet: {
                    ETH: {
                      pendingConfig: {
                        takeProfitPrice: '3500',
                        timestamp: Date.now(),
                      },
                    },
                  },
                },
              },
            },
          },
        },
        initialParams: {
          asset: 'ETH',
          direction: 'long',
          amount: '120',
          leverage: 4,
          useBottomSheet: true,
        },
        streamOverrides: {
          account,
          positions: [],
          orders: [],
          marketData: [ethMarket],
        },
        extraRoutes: [marketDetailsRoute],
      });
      await waitForDeferredOrderData();
      emitEthPrice(stream);
      await screen.findByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON);
      await waitFor(() => {
        expect(
          screen.getByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
        ).not.toBeDisabled();
      });
      // The separate TP/SL update runs only after pending take-profit is on
      // the form. The place button can enable first; pressing then leaves the
      // in-progress "Order submitted" toast up and never shows the error.
      await waitFor(() => {
        expect(
          screen.getByText(
            new RegExp(
              `${strings('perps.order.tp')} (?!${strings('perps.order.off')})`,
            ),
          ),
        ).toBeOnTheScreen();
      });

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
        );
      });

      expect(
        await screen.findByTestId(`route-${Routes.PERPS.MARKET_DETAILS}`),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText(
          strings(messageKey),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(placeOrder).toHaveBeenCalledTimes(1);
      expect(updatePositionTPSL).toHaveBeenCalledTimes(1);
      expect(updatePositionTPSL).toHaveBeenCalledWith({
        symbol: 'ETH',
        takeProfitPrice: '3500',
        stopLossPrice: undefined,
      });
      expect(
        screen.getByText(strings('perps.position.tpsl.update_failed')),
      ).toBeOnTheScreen();
    },
  );

  it('keeps the minimum-order error visible during protocol validation', async () => {
    const validateOrder = Engine.context.PerpsController
      .validateOrder as jest.Mock;
    let resolvePendingValidation:
      | ((result: { isValid: boolean }) => void)
      | undefined;
    const pendingValidation = new Promise<{ isValid: boolean }>((resolve) => {
      resolvePendingValidation = resolve;
    });
    validateOrder.mockReturnValue(pendingValidation);

    renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '1',
        leverage: 4,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [ethMarket],
        prices: {
          ETH: {
            symbol: 'ETH',
            price: '2500',
            markPrice: '2500',
            percentChange24h: '2',
            timestamp: 1,
            isTradable: true,
          },
        },
      },
    });

    const placeOrderButton = await screen.findByTestId(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
    const minimumOrderError = await screen.findByText(
      strings('perps.order.validation.minimum_amount', { amount: '10' }),
    );
    expect(placeOrderButton).toBeDisabled();
    fireEvent.press(placeOrderButton);
    expect(Engine.context.PerpsController.placeOrder).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(validateOrder).toHaveBeenCalled();
    });

    expect(placeOrderButton).toBeOnTheScreen();
    expect(placeOrderButton).toBeDisabled();
    expect(placeOrderButton.props.accessibilityState?.busy).not.toBe(true);
    expect(minimumOrderError).toBeOnTheScreen();
    expect(Engine.context.PerpsController.placeOrder).not.toHaveBeenCalled();

    await act(async () => {
      resolvePendingValidation?.({ isValid: true });
      await pendingValidation;
    });
    validateOrder.mockResolvedValue({ isValid: true });

    await waitFor(() => {
      expect(placeOrderButton).toBeDisabled();
      expect(minimumOrderError).toBeOnTheScreen();
    });
  });

  it('reopens a below-minimum order while market sizing is unavailable', async () => {
    const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
    const renderOptions = {
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long' as const,
        amount: '1',
        leverage: 4,
        defaultSzDecimals: undefined,
        defaultMaxLeverage: undefined,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [],
        prices: {},
      },
    };
    const firstRender = renderPerpsOrderView(renderOptions);
    await screen.findByTestId(PerpsOrderHeaderSelectorsIDs.HEADER);
    firstRender.unmount();

    renderPerpsOrderView(renderOptions);

    const placeOrderButton = await screen.findByTestId(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
    expect(placeOrderButton).toBeDisabled();
    fireEvent.press(placeOrderButton);
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('switches to limit order, accepts the Mid preset, and routes to TP/SL setup', async () => {
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'short',
        amount: '200',
        leverage: 3,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
      extraRoutes: [{ name: Routes.PERPS.TPSL }],
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream, '-1');

    fireEvent.press(
      await screen.findByTestId(
        PerpsOrderHeaderSelectorsIDs.ORDER_TYPE_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      ),
    );
    await act(async () => {
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
        ),
      );
    });

    expect(
      await screen.findByText(
        strings('perps.order.limit_price_modal.title'),
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID),
    );
    fireEvent.press(
      screen.getByTestId(PerpsLimitPriceBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(
      await screen.findByTestId(PerpsOrderViewSelectorsIDs.LIMIT_PRICE_ROW),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(PerpsOrderViewSelectorsIDs.STOP_LOSS_BUTTON),
    );

    expect(
      await screen.findByTestId(`route-${Routes.PERPS.TPSL}`),
    ).toBeOnTheScreen();
  });

  it('blocks order submission when the account cannot satisfy the minimum order amount', async () => {
    const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '5',
        leverage: 1,
      },
      streamOverrides: {
        account: accountWithBalance('1'),
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    // The balance cannot cover the margin either, so the shared
    // insufficient-funds banner owns that message and the CTA keeps its label.
    expect(
      await screen.findByText(
        strings('perps.order.validation.insufficient_funds_to_cover_trade'),
      ),
    ).toBeOnTheScreen();
    const placeOrderButton = await screen.findByTestId(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
    expect(placeOrderButton).toBeDisabled();

    fireEvent.press(placeOrderButton);

    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('shows a single insufficient-funds treatment when the balance cannot cover the margin', async () => {
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '120',
        leverage: 4,
      },
      streamOverrides: {
        account: accountWithBalance('0.00004'),
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    await waitFor(() => {
      expect(
        screen.queryAllByText(
          strings('perps.order.validation.insufficient_funds_to_cover_trade'),
        ),
      ).toHaveLength(1);
    });
    // The footer validation line renders the interpolated balance error; match
    // the invariant prefix so the assertion cannot pass on a formatting change.
    expect(screen.queryByText(/^Insufficient balance\./)).toBeNull();
    expect(
      screen.queryByText(strings('perps.order.validation.insufficient_funds')),
    ).toBeNull();
    expect(
      screen.getByTestId(PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON),
    ).toBeDisabled();
  });

  it('keeps a blocking minimum-amount error visible next to the insufficient-funds banner', async () => {
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '5',
        leverage: 1,
      },
      streamOverrides: {
        account: accountWithBalance('0.00004'),
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    await waitFor(() => {
      expect(
        screen.queryAllByText(
          strings('perps.order.validation.insufficient_funds_to_cover_trade'),
        ),
      ).toHaveLength(1);
    });
    // The banner covers the balance message only; the minimum-amount error is a
    // separate blocking reason and must still reach the trader.
    expect(screen.queryByText(/^Insufficient balance\./)).toBeNull();
    expect(screen.getByText(/^Minimum order size/)).toBeOnTheScreen();
  });

  describe('Trade sheet (bottom-sheet treatment)', () => {
    const tradeSheetParams = {
      asset: 'ETH',
      direction: 'long',
      amount: '120',
      leverage: 4,
      useBottomSheet: true,
    };
    const cachedEthPrice: PriceUpdate = {
      symbol: 'ETH',
      price: '2700',
      percentChange24h: '0.02',
      timestamp: 1,
      isTradable: true,
    };
    const cachedEthChart: CandleData = {
      symbol: 'ETH',
      interval: CandlePeriod.FifteenMinutes,
      candles: [
        {
          time: Date.now(),
          open: '2737.9',
          high: '2737.9',
          low: '2737.9',
          close: '2737.9',
          volume: '1',
        },
      ],
    };
    const headerCache = {
      cachedPrices: { ETH: cachedEthPrice },
      cachedCandles: cachedEthChart,
    };
    const chartPeriodOverrides = {
      settings: {
        perpsChartPreferences: {
          preferredCandlePeriod: CandlePeriod.FifteenMinutes,
        },
      },
    };

    const headerPriceText = (price: number) =>
      formatPerpsFiat(price, { ranges: PRICE_RANGES_UNIVERSAL });
    const headerChangeText = (percent: number) =>
      formatPercentage(String(percent));

    const renderTradeSheet = (
      options: {
        initialParams?: Record<string, unknown>;
        streamOverrides?: PerpsStreamOverrides;
      } = {},
    ) =>
      renderPerpsOrderView({
        overrides: {
          ...eligibleOverrides,
          ...chartPeriodOverrides,
        },
        initialParams: { ...tradeSheetParams, ...options.initialParams },
        streamOverrides: {
          account,
          positions: [],
          orders: [],
          marketData: [ethMarket],
          ...options.streamOverrides,
        },
        extraRoutes: [marketDetailsRoute],
      });

    const findEnabledSubmitButton = async () => {
      const submitButton = await screen.findByTestId(
        PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      );
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
      return submitButton;
    };

    it('shows promotional pricing when Core returns a grant fee quote', async () => {
      const calculateFees = Engine.context.PerpsController
        .calculateFees as jest.Mock;
      calculateFees.mockResolvedValue(GRANT_FEE_QUOTE);
      const { stream } = renderTradeSheet();
      await waitForDeferredOrderData();
      emitEthPrice(stream);

      expect(
        await screen.findByTestId(
          PerpsTradeSheetSelectorsIDs.FEE_TEXT,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toHaveTextContent(
        strings('perps.trade_sheet.includes_fee_after_promo', {
          originalFeePercentage: '0.145',
          feePercentage: '0.070',
        }),
      );
    });

    it('shows the spendable Perps balance on the pay with row when it differs from the total', async () => {
      const spendableBalance = '250.5';
      const totalBalance = '5000';
      const availableLabel = formatPerpsFiat(spendableBalance, {
        ranges: PRICE_RANGES_MINIMAL_VIEW,
      });
      const { stream } = renderPerpsOrderView({
        overrides: {
          ...eligibleOverrides,
          ...chartPeriodOverrides,
          engine: {
            backgroundState: {
              ...eligibleOverrides.engine.backgroundState,
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsTradeWithAnyTokenIsEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
        initialParams: tradeSheetParams,
        streamOverrides: {
          account: {
            ...accountWithBalance(spendableBalance),
            totalBalance,
          },
          positions: [],
          orders: [],
          marketData: [ethMarket],
        },
        extraRoutes: [marketDetailsRoute],
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      expect(
        await screen.findByLabelText(
          `${strings('confirm.label.pay_with')}, ${strings(
            'perps.adjust_margin.perps_balance',
          )} (${availableLabel})`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
    });

    it('leaves the sheet for the market page as soon as the order is submitted', async () => {
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      let resolveOrder: (result: { success: boolean }) => void = () =>
        undefined;
      placeOrder.mockReturnValue(
        new Promise<{ success: boolean }>((resolve) => {
          resolveOrder = resolve;
        }),
      );
      const { stream } = renderTradeSheet();
      await waitForDeferredOrderData();
      emitEthPrice(stream);
      const submitButton = await findEnabledSubmitButton();

      await act(async () => {
        fireEvent.press(submitButton);
      });

      // The market page shows while execution is still pending.
      expect(
        await screen.findByTestId(
          `route-${Routes.PERPS.MARKET_DETAILS}`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH',
          isBuy: true,
          orderType: 'market',
          leverage: 4,
          usdAmount: '120',
        }),
      );
      await act(async () => {
        resolveOrder({ success: true });
      });
      placeOrder.mockResolvedValue({ success: true });
    });

    it('places the order and stays off the market page when stayOnCurrentScreen is set', async () => {
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      placeOrder.mockResolvedValue({ success: true });
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        initialParams: {
          ...tradeSheetParams,
          stayOnCurrentScreen: true,
        },
        streamOverrides: {
          account,
          positions: [],
          orders: [],
          marketData: [ethMarket],
        },
        extraRoutes: [marketDetailsRoute],
      });
      await waitForDeferredOrderData();
      emitEthPrice(stream);
      const submitButton = await findEnabledSubmitButton();

      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(placeOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'ETH',
            isBuy: true,
            orderType: 'market',
          }),
        );
      });
      expect(
        screen.queryByTestId(`route-${Routes.PERPS.MARKET_DETAILS}`),
      ).toBeNull();
    });

    // Dismissing the sheet runs its exit animation and `onClose` before the
    // navigation transition would unmount the view. The view framework renders
    // the design-system BottomSheet as a plain View (no backdrop or swipe), so
    // the dismissal itself cannot be driven here; the sheet-reported-closed half
    // of this guard lives in PerpsOrderView.test.tsx. This covers the other
    // half: the view is gone before validation settles.
    it('does not place an order when the sheet is gone while validation is pending', async () => {
      const validateOrder = Engine.context.PerpsController
        .validateOrder as jest.Mock;
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      let holdValidation = false;
      let resolvePendingValidation: (result: {
        isValid: boolean;
      }) => void = () => undefined;
      const pendingValidation = new Promise<{ isValid: boolean }>((resolve) => {
        resolvePendingValidation = resolve;
      });
      validateOrder.mockImplementation(() =>
        holdValidation ? pendingValidation : Promise.resolve({ isValid: true }),
      );
      const { stream, unmount } = renderTradeSheet();
      await waitForDeferredOrderData();
      emitEthPrice(stream);
      const submitButton = await findEnabledSubmitButton();

      // A price move re-validates the order; hold that validation open so the
      // submit below has to await it.
      holdValidation = true;
      const validationCallsBefore = validateOrder.mock.calls.length;
      emitEthPrice(stream, '2', '2510');
      await waitFor(
        () => {
          expect(validateOrder.mock.calls.length).toBeGreaterThan(
            validationCallsBefore,
          );
        },
        { timeout: TIMEOUT_MS },
      );
      await act(async () => {
        fireEvent.press(submitButton);
      });
      expect(placeOrder).not.toHaveBeenCalled();

      await act(async () => {
        unmount();
      });
      await act(async () => {
        resolvePendingValidation({ isValid: true });
        await pendingValidation;
      });
      validateOrder.mockResolvedValue({ isValid: true });

      expect(placeOrder).not.toHaveBeenCalled();
    });

    it('shows the cached asset-screen chart price before a new price tick', async () => {
      renderTradeSheet({ streamOverrides: headerCache });

      expect(
        await screen.findByTestId(
          PerpsTradeSheetSelectorsIDs.HEADER_PRICE,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toHaveTextContent(headerPriceText(2737.9));
      expect(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.HEADER_CHANGE),
      ).toHaveTextContent(headerChangeText(0.02));
      expect(
        screen.queryByTestId(PerpsTradeSheetSelectorsIDs.HEADER_SKELETON),
      ).not.toBeOnTheScreen();
    });

    it('falls back to the cached mid when the chart cache is stale', async () => {
      renderTradeSheet({
        streamOverrides: { ...headerCache, chartCacheFresh: false },
      });

      expect(
        await screen.findByTestId(
          PerpsTradeSheetSelectorsIDs.HEADER_PRICE,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toHaveTextContent(headerPriceText(2700));
      expect(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.HEADER_CHANGE),
      ).toHaveTextContent(headerChangeText(0.02));
      expect(
        screen.queryByTestId(PerpsTradeSheetSelectorsIDs.HEADER_SKELETON),
      ).not.toBeOnTheScreen();
    });

    it('shows the focused price when chart and mid caches are absent', async () => {
      renderTradeSheet({
        streamOverrides: {
          cachedFocusedPrice: {
            symbol: 'ETH',
            price: '2715',
            percentChange24h: '0.5',
            timestamp: 1,
            isTradable: true,
          },
        },
      });

      expect(
        await screen.findByTestId(
          PerpsTradeSheetSelectorsIDs.HEADER_PRICE,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toHaveTextContent(headerPriceText(2715));
      expect(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.HEADER_CHANGE),
      ).toHaveTextContent(headerChangeText(0.5));
      expect(
        screen.queryByTestId(PerpsTradeSheetSelectorsIDs.HEADER_SKELETON),
      ).not.toBeOnTheScreen();
    });

    it('does not use the chart close when the Advanced Chart is active', async () => {
      renderTradeSheet({
        initialParams: {
          chartLibrary: PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED,
        },
        streamOverrides: headerCache,
      });

      expect(
        await screen.findByTestId(
          PerpsTradeSheetSelectorsIDs.HEADER_PRICE,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toHaveTextContent(headerPriceText(2700));
      expect(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.HEADER_CHANGE),
      ).toHaveTextContent(headerChangeText(0.02));
    });

    it('shows the header skeleton when nothing is cached yet', async () => {
      renderTradeSheet();

      expect(
        await screen.findByTestId(
          PerpsTradeSheetSelectorsIDs.HEADER_SKELETON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsTradeSheetSelectorsIDs.HEADER_PRICE),
      ).not.toBeOnTheScreen();
    });

    it('follows the live mid once the sheet subscription delivers', async () => {
      const { stream } = renderTradeSheet({ streamOverrides: headerCache });

      expect(
        await screen.findByTestId(
          PerpsTradeSheetSelectorsIDs.HEADER_PRICE,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toHaveTextContent(headerPriceText(2737.9));

      emitEthPrice(stream, '1.5', '2740');

      await waitFor(
        () => {
          expect(
            screen.getByTestId(PerpsTradeSheetSelectorsIDs.HEADER_PRICE),
          ).toHaveTextContent(headerPriceText(2740));
          expect(
            screen.getByTestId(PerpsTradeSheetSelectorsIDs.HEADER_CHANGE),
          ).toHaveTextContent(headerChangeText(1.5));
        },
        { timeout: TIMEOUT_MS },
      );
      expect(
        screen.queryByTestId(PerpsTradeSheetSelectorsIDs.HEADER_SKELETON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('fee-adjusted max size', () => {
    const LEVERAGE = 4;
    const BALANCE = 1000;
    // Far above the ceiling, so the form settles on the max (the 100% slider).
    const ABOVE_MAX_AMOUNT = '100000';
    // Reserving 0.5% of notional at 4x leaves this ceiling; unreserved is ~3980.
    const LOW_FEE_QUOTE = { protocolFeeRate: 0.0045, metamaskFeeRate: 0.0005 };
    const HIGH_FEE_QUOTE = { protocolFeeRate: 0.0095, metamaskFeeRate: 0.0005 };
    const budgetCeiling = (feeRate: number) =>
      BALANCE / (1 / LEVERAGE + feeRate);

    const mockQuote = (quote: object) =>
      (
        Engine.context.PerpsController.calculateFees as jest.Mock
      ).mockResolvedValue(quote);

    const renderWithAmount = async (amount: string) => {
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        initialParams: {
          asset: 'ETH',
          direction: 'long',
          amount,
          leverage: LEVERAGE,
        },
        streamOverrides: {
          account,
          positions: [],
          orders: [],
          marketData: [ethMarket],
        },
        extraRoutes: [marketDetailsRoute],
      });
      await waitForDeferredOrderData();
      emitEthPrice(stream);
    };

    const renderAtMax = () => renderWithAmount(ABOVE_MAX_AMOUNT);

    // The amount renders as one animated Text per glyph, so join their text.
    const readDisplayedAmount = () =>
      Number(
        screen
          .getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL)
          .findAllByType(Text)
          .map((glyph) => glyph.props.children)
          .join('')
          .replace(/[^0-9.]/g, ''),
      );

    // Runs while the order form is still mounted, before the order is placed.
    const expectNoBalanceError = () => {
      const fundsMessage = strings(
        'perps.order.validation.insufficient_funds_to_cover_trade',
      );
      expect(fundsMessage).not.toMatch(/^\[missing/);
      expect(
        screen.getByTestId(PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/^Insufficient balance\./)).toBeNull();
      expect(screen.queryByText(fundsMessage)).toBeNull();
    };

    const waitForDisplayedAmount = (matches: (amount: number) => boolean) =>
      waitFor(() => expect(matches(readDisplayedAmount())).toBe(true), {
        timeout: TIMEOUT_MS,
      });

    const placeOrderAndReadAmount = async () => {
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      const button = await waitForEnabledPlaceOrderButton();
      expectNoBalanceError();
      await act(async () => {
        fireEvent.press(button);
      });
      await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(1));
      return Number(placeOrder.mock.calls[0][0].usdAmount);
    };

    it('sizes the max so margin plus fee fits the balance and keeps the CTA enabled', async () => {
      mockQuote(LOW_FEE_QUOTE);

      await renderAtMax();
      await waitForDisplayedAmount(
        (amount) => amount <= budgetCeiling(0.005) && amount > 3800,
      );
      const displayedAmount = readDisplayedAmount();
      const usdAmount = await placeOrderAndReadAmount();

      expect(usdAmount).toBe(displayedAmount);
      expect(usdAmount / LEVERAGE + usdAmount * 0.005).toBeLessThanOrEqual(
        BALANCE,
      );
    });

    it('keeps a partial size untouched by the fee reservation', async () => {
      mockQuote(LOW_FEE_QUOTE);

      await renderWithAmount('2000');
      await waitForEnabledPlaceOrderButton();

      expect(readDisplayedAmount()).toBe(2000);
      expect(await placeOrderAndReadAmount()).toBe(2000);
    });

    it('shrinks the max again when a refreshed quote raises the fee while at max', async () => {
      mockQuote(LOW_FEE_QUOTE);
      await renderAtMax();
      await waitForDisplayedAmount(
        (amount) =>
          amount <= budgetCeiling(0.005) && amount > budgetCeiling(0.01),
      );
      const lowFeeMax = readDisplayedAmount();

      // A new quote arrives with the next amount edit (the quote is keyed on it).
      mockQuote(HIGH_FEE_QUOTE);
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
        );
      });
      await act(async () => {
        fireEvent.press(
          await screen.findByTestId(PerpsOrderViewSelectorsIDs.KEYPAD_50_PCT),
        );
      });
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(PerpsOrderViewSelectorsIDs.KEYPAD_MAX),
        );
      });
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(PerpsOrderViewSelectorsIDs.KEYPAD_DONE),
        );
      });

      await waitForDisplayedAmount(
        (amount) => amount < lowFeeMax && amount <= budgetCeiling(0.01),
      );
      const usdAmount = await placeOrderAndReadAmount();
      expect(usdAmount / LEVERAGE + usdAmount * 0.01).toBeLessThanOrEqual(
        BALANCE,
      );
    });

    it('holds the unreserved max while the quote is pending and shrinks it once it resolves', async () => {
      let resolveQuote: (quote: object) => void = () => undefined;
      (
        Engine.context.PerpsController.calculateFees as jest.Mock
      ).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveQuote = resolve;
          }),
      );

      await renderAtMax();
      await waitForDisplayedAmount((amount) => amount > 3900);
      expect(await waitForEnabledPlaceOrderButton()).toBeOnTheScreen();
      expectNoBalanceError();

      await act(async () => {
        resolveQuote(HIGH_FEE_QUOTE);
      });
      await waitForDisplayedAmount(
        (amount) => amount <= budgetCeiling(0.01) && amount > 3700,
      );
      const usdAmount = await placeOrderAndReadAmount();

      expect(usdAmount / LEVERAGE + usdAmount * 0.01).toBeLessThanOrEqual(
        BALANCE,
      );
    });

    it('falls back to the unreserved max when the quote is rejected', async () => {
      (
        Engine.context.PerpsController.calculateFees as jest.Mock
      ).mockRejectedValue(new Error('fee quote unavailable'));

      await renderAtMax();
      await waitForDisplayedAmount((amount) => amount > 3900);
      const usdAmount = await placeOrderAndReadAmount();

      expect(usdAmount).toBeGreaterThan(3900);
    });
  });

  it('routes cross-margin positions to the warning modal instead of placing an order', async () => {
    const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '120',
        leverage: 10,
      },
      streamOverrides: {
        account,
        positions: [
          {
            ...defaultPositionForViews,
            leverage: { value: 10, type: 'cross' },
          },
        ],
        orders: [],
        marketData: [ethMarket],
      },
      extraRoutes: [crossMarginWarningRoute],
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    const placeOrderButton = await screen.findByTestId(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
    await waitFor(() => {
      expect(placeOrderButton).not.toBeDisabled();
    });
    fireEvent.press(placeOrderButton);

    expect(
      await screen.findByTestId(`route-${Routes.PERPS.MODALS.ROOT}`),
    ).toBeOnTheScreen();
    expect(placeOrder).not.toHaveBeenCalled();
  });
  describe('market order liquidity', () => {
    const bookLevel = (price: number, size: number): OrderBookLevel => ({
      price: String(price),
      size: String(size),
      total: String(size),
      notional: String(price * size),
      totalNotional: String(price * size),
    });
    const book = (
      levels: OrderBookLevel[],
      direction: 'long' | 'short',
    ): OrderBookData => ({
      midPrice: '2500',
      asks: direction === 'long' ? levels : [],
      bids: direction === 'short' ? levels : [],
      spread: '0',
      spreadPercentage: '0',
      lastUpdated: Date.now(),
      maxTotal: '1',
    });

    it.each([
      { useBottomSheet: false, direction: 'long' as const, shallow: null },
      { useBottomSheet: true, direction: 'long' as const, shallow: null },
      { useBottomSheet: false, direction: 'long' as const, shallow: true },
      { useBottomSheet: false, direction: 'short' as const, shallow: true },
      { useBottomSheet: true, direction: 'long' as const, shallow: true },
      { useBottomSheet: true, direction: 'short' as const, shallow: true },
      { useBottomSheet: false, direction: 'long' as const, shallow: false },
      { useBottomSheet: false, direction: 'short' as const, shallow: false },
      { useBottomSheet: true, direction: 'long' as const, shallow: false },
      { useBottomSheet: true, direction: 'short' as const, shallow: false },
    ])(
      'blocks the $direction order with shallow=$shallow, sheet=$useBottomSheet, then submits after depth recovers',
      async ({ useBottomSheet, direction, shallow }) => {
        const placeOrder = jest.mocked(
          Engine.context.PerpsController.placeOrder,
        );
        const blockedBook = book(
          shallow
            ? [bookLevel(2500, 0.001)]
            : [
                bookLevel(2500, 0.049),
                bookLevel(direction === 'long' ? 2600 : 2400, 1),
              ],
          direction,
        );
        // The live book hook throttles and can resubscribe. Replaying only the
        // first payload drops a recovered book that arrived inside the throttle
        // window, so the CTA stays disabled. Keep the latest book and fan it
        // out to every active subscriber.
        const subscribers = new Set<(value: OrderBookData) => void>();
        let latestBook: OrderBookData | undefined =
          shallow === null ? undefined : blockedBook;
        const deliver = (value: OrderBookData) => {
          latestBook = value;
          subscribers.forEach((subscriber) => {
            subscriber(value);
          });
        };
        jest
          .mocked(Engine.context.PerpsController.subscribeToOrderBook)
          .mockImplementation(({ callback, onError }) => {
            subscribers.add(callback);
            if (latestBook) {
              callback(latestBook);
            } else {
              onError?.(new Error('order book unavailable'));
            }
            return () => {
              subscribers.delete(callback);
            };
          });
        const { stream } = renderPerpsOrderView({
          overrides: eligibleOverrides,
          initialParams: {
            asset: 'ETH',
            direction,
            amount: '120',
            leverage: 4,
            useBottomSheet,
          },
          streamOverrides: {
            account,
            positions: [],
            orders: [],
            marketData: [ethMarket],
          },
          extraRoutes: [marketDetailsRoute],
        });

        await waitForDeferredOrderData();
        emitEthPrice(stream);
        const message = strings(
          shallow !== false
            ? 'perps.slippage.insufficient_depth'
            : useBottomSheet
              ? 'perps.slippage.cannot_fill_reduce_size'
              : 'perps.slippage.cannot_fill',
        );
        expect(await screen.findByText(message)).toBeOnTheScreen();
        const submitId = useBottomSheet
          ? PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON
          : PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON;
        const submit = await screen.findByTestId(submitId);
        expect(submit).toBeDisabled();
        fireEvent.press(submit);
        expect(placeOrder).not.toHaveBeenCalled();

        await act(async () => {
          deliver(book([bookLevel(2500, 1)], direction));
        });
        await waitForEnabledPlaceOrderButton(submitId);
        expect(screen.queryByText(message)).not.toBeOnTheScreen();
        await act(async () => {
          fireEvent.press(screen.getByTestId(submitId));
        });
        await waitFor(
          () =>
            expect(placeOrder).toHaveBeenCalledWith(
              expect.objectContaining({
                symbol: 'ETH',
                isBuy: direction === 'long',
                orderType: 'market',
                usdAmount: '120',
              }),
            ),
          { timeout: TIMEOUT_MS },
        );
      },
    );

    it('keeps a limit order unblocked when the order book is unavailable', async () => {
      const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
      jest
        .mocked(Engine.context.PerpsController.subscribeToOrderBook)
        .mockImplementation(({ onError }) => {
          onError?.(new Error('order book unavailable'));
          return () => undefined;
        });
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        initialParams: {
          asset: 'ETH',
          direction: 'long',
          amount: '120',
          leverage: 4,
        },
        streamOverrides: {
          account,
          positions: [],
          orders: [],
          marketData: [ethMarket],
        },
        extraRoutes: [marketDetailsRoute],
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);
      const message = strings('perps.slippage.insufficient_depth');
      expect(await screen.findByText(message)).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(PerpsOrderHeaderSelectorsIDs.ORDER_TYPE_BUTTON),
      );
      await act(async () => {
        fireEvent.press(
          await screen.findByTestId(
            PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
          ),
        );
      });
      fireEvent.press(
        await screen.findByTestId(
          PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );
      fireEvent.press(
        screen.getByTestId(
          PerpsLimitPriceBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        ),
      );
      expect(
        await screen.findByTestId(PerpsOrderViewSelectorsIDs.LIMIT_PRICE_ROW),
      ).toBeOnTheScreen();

      await waitFor(() =>
        expect(
          screen.getByTestId(PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON),
        ).not.toBeDisabled(),
      );
      expect(screen.queryByText(message)).not.toBeOnTheScreen();
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON),
        );
      });
      await waitFor(() =>
        expect(placeOrder).toHaveBeenCalledWith(
          expect.objectContaining({ symbol: 'ETH', orderType: 'limit' }),
        ),
      );
    });

    it('keeps a market order enabled while the order book subscription is pending', async () => {
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        initialParams: {
          asset: 'ETH',
          direction: 'long',
          amount: '120',
          leverage: 4,
        },
        streamOverrides: {
          account,
          positions: [],
          orders: [],
          marketData: [ethMarket],
        },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      await waitFor(() =>
        expect(
          screen.getByTestId(PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON),
        ).not.toBeDisabled(),
      );
      expect(
        Engine.context.PerpsController.subscribeToOrderBook,
      ).toHaveBeenCalled();
      expect(
        screen.queryByText(strings('perps.slippage.insufficient_depth')),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText(strings('perps.slippage.cannot_fill')),
      ).not.toBeOnTheScreen();
    });
  });
});
