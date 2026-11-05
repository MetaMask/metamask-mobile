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
  calculatePositionSize,
  CandlePeriod,
  PERPS_CONSTANTS,
  PERPS_ERROR_CODES,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type CandleData,
  type CrossLiquidationEstimate,
  type PriceUpdate,
  type OrderBookData,
  type OrderBookLevel,
  type OrderResult,
  type Position,
  type PerpsControllerState,
} from '@metamask/perps-controller';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type TransactionConfig,
} from '@metamask/transaction-pay-controller';
import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { analytics } from '../../../../../util/analytics/analytics';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { crossMarginMarketInfo } from '../../../../../../tests/component-view/helpers/perpsMarginModeTestHelpers';
import {
  wirePerpsControllerForStore,
  withLighterBuildEnabled,
} from '../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import {
  defaultPositionForViews,
  renderPerpsOrderView,
  type PerpsExtraRoute,
  type PerpsStreamOverrides,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsBottomSheetTooltipSelectorsIDs,
  PerpsLimitPriceBottomSheetSelectorsIDs,
  PerpsFeeDiscountLabelSelectorsIDs,
  PerpsBottomSheetTooltipSelectorsIDs,
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsTPSLViewSelectorsIDs,
  PerpsTradeSheetSelectorsIDs,
} from '../../Perps.testIds';
import {
  createCrossMarginAccountForViews,
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { perpsTwoExchangeState } from '../../../../../../tests/component-view/presets/perpsTwoExchangePresets';
import {
  formatPercentage,
  formatPerpsFiat,
  formatPositionSize,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { resetPerpsCufTraceForTests } from '../../utils/perpsCufTrace';
import { MembershipVipBadgeSelectorsIDs } from '../../../shared/MembershipVipBadge/MembershipVipBadge';
import { PERPS_ANALYTICS_SIZE_UNIT } from '../../constants/perpsAnalytics';
import { KeypadTestIds } from '../../../../Base/Keypad/Keypad.testIds';

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

const setMockPerpsControllerState = (state: PerpsControllerState) => {
  const engineState: unknown = Reflect.get(Engine, 'state');
  if (
    engineState !== undefined &&
    (typeof engineState !== 'object' ||
      engineState === null ||
      Array.isArray(engineState))
  ) {
    throw new Error('Expected the component-view Engine mock to expose state');
  }
  Reflect.set(Engine, 'state', {
    ...(engineState ?? {}),
    PerpsController: state,
  });
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
): void => {
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

const waitForDeferredOrderData = async (): Promise<void> => {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
};

// A price or form change after the first validation keeps the CTA disabled
// for the real ValidationDebounceMs (300ms) plus protocol validation, which a
// loaded CV shard can stretch past waitFor's 1s default.
const waitForEnabledPlaceOrderButton = async (
  testId: string = PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
): Promise<ReturnType<typeof screen.getByTestId>> => {
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
      .mocked(Engine.context.PerpsController.calculateLiquidationPrice)
      .mockReset()
      .mockResolvedValue('0.00');
    jest
      .mocked(Engine.context.PerpsController.estimateCrossLiquidation)
      .mockReset()
      .mockResolvedValue({ status: 'unavailable', reason: 'provider' });
    jest
      .mocked(Engine.context.PerpsController.getMarginModeLock)
      .mockReset()
      .mockResolvedValue({
        status: 'unlocked',
        providerId: 'hyperliquid',
      });
    jest
      .mocked(Engine.context.PerpsController.updatePositionTPSL)
      .mockReset()
      .mockResolvedValue({ success: true });
    jest
      .mocked(Engine.context.PerpsController.subscribeToOrderBook)
      .mockReset();
    jest
      .mocked(Engine.context.PerpsController.subscribeToOrderBook)
      .mockImplementation(() => (): void => undefined);
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
    // The view clears the pending trade config only after the CUF confirm race
    // settles. Deliver the fill on the next macrotask so the race resolves from
    // the positions stream instead of its 1s wall-clock timeout.
    const filledLong = createLongPositionForViews({
      size: '0.048',
      marginUsed: '30',
      positionValue: '120',
      leverage: { value: 4, type: 'isolated' },
    });
    placeOrder.mockImplementation(async () => {
      setTimeout(() => {
        stream.emitPositions([filledLong]);
      }, 0);
      return { success: true, orderId: 'component-view-order' };
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

  it('drops a full-screen submission when the trader goes back during the account-support check', async () => {
    const getAccountSupport = jest.mocked(
      Engine.context.PerpsController.getAccountSupport,
    );
    const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
    let resolveAccountSupport: (
      result: Awaited<ReturnType<typeof getAccountSupport>>,
    ) => void = () => undefined;
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
      presentingRoute: Routes.PERPS.MARKET_DETAILS,
    });
    await waitForDeferredOrderData();
    emitEthPrice(stream);
    const placeOrderButton = await waitForEnabledPlaceOrderButton();
    getAccountSupport.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAccountSupport = resolve;
      }),
    );

    fireEvent.press(placeOrderButton);
    await waitFor(() => expect(getAccountSupport).toHaveBeenCalledTimes(2));
    fireEvent.press(
      screen.getByTestId(PerpsOrderHeaderSelectorsIDs.BACK_BUTTON),
    );
    await act(async () => {
      resolveAccountSupport({ isSupported: true });
    });

    expect(
      await screen.findByTestId(`route-${Routes.PERPS.MARKET_DETAILS}`),
    ).toBeOnTheScreen();
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('drops a full-screen submission when the trader switches tabs during the account-support check', async () => {
    const getAccountSupport = jest.mocked(
      Engine.context.PerpsController.getAccountSupport,
    );
    const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
    let resolveAccountSupport: (
      result: Awaited<ReturnType<typeof getAccountSupport>>,
    ) => void = () => undefined;
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
      siblingTab: Routes.WALLET_VIEW,
    });
    await waitForDeferredOrderData();
    emitEthPrice(stream);
    const placeOrderButton = await waitForEnabledPlaceOrderButton();
    getAccountSupport.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAccountSupport = resolve;
      }),
    );

    fireEvent.press(placeOrderButton);
    await waitFor(() => expect(getAccountSupport).toHaveBeenCalledTimes(2));
    fireEvent.press(screen.getByTestId(`tab-${Routes.WALLET_VIEW}`));
    expect(
      await screen.findByTestId(`route-${Routes.WALLET_VIEW}`),
    ).toBeOnTheScreen();
    await act(async () => {
      resolveAccountSupport({ isSupported: true });
    });
    await waitForDeferredOrderData();

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
    act(() => {
      setMockPerpsControllerState({
        ...currentPerpsState,
        isTestnet: true,
      });
      store.dispatch(updateBgState({ key: 'PerpsController' }));
    });
    setMockPerpsControllerState(currentPerpsState);
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

  describe('Fee Display Format A/B test', () => {
    const withFeeDisplayVariant = (
      variant: 'control' | 'treatment',
    ): NonNullable<
      Parameters<typeof renderPerpsOrderView>[0]
    >['overrides'] => ({
      engine: {
        backgroundState: {
          ...eligibleOverrides.engine.backgroundState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsTAT4046AbtestFeeDisplayFormat: variant,
            },
          },
        },
      },
    });

    it('keeps the $ fee row and requests a single quote for control', async () => {
      const calculateFees = Engine.context.PerpsController
        .calculateFees as jest.Mock;
      calculateFees.mockResolvedValue({
        protocolFeeRate: 0.00045,
        metamaskFeeRate: 0.00005,
      });
      const { stream } = renderPerpsOrderView({
        overrides: withFeeDisplayVariant('control'),
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

      await waitFor(() => {
        expect(
          screen.getByTestId(PerpsOrderViewSelectorsIDs.FEES_VALUE),
        ).toHaveTextContent('$0.06');
      });
      expect(calculateFees).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(PerpsOrderViewSelectorsIDs.FEES_VALUE_TAKER),
      ).not.toBeOnTheScreen();
    });

    it("requests the opposite side as a limit execution (not this market order's own type) and renders both rates for treatment", async () => {
      const calculateFees = Engine.context.PerpsController
        .calculateFees as jest.Mock;
      // Distinct taker/maker quotes, keyed on `isMaker`. A real HyperLiquid
      // market order is always charged taker regardless of the `isMaker`
      // flag it is sent — so if the opposite-side request kept `orderType:
      // 'market'`, it would get this same taker quote back a second time,
      // and the maker rate below would never be reachable from a market
      // order. Keying the mock on `isMaker` (not `orderType`) reproduces
      // that real provider behavior and proves the fix actually asks for
      // `orderType: 'limit'` to reach the maker quote.
      calculateFees.mockImplementation(
        ({ isMaker }: { isMaker: boolean }) =>
          Promise.resolve(
            isMaker
              ? { protocolFeeRate: 0.0009, metamaskFeeRate: 0.00024 } // maker: 0.114%
              : { protocolFeeRate: 0.00118, metamaskFeeRate: 0.00025 }, // taker: 0.143%
          ) as Promise<Record<string, unknown>>,
      );
      const { stream } = renderPerpsOrderView({
        overrides: withFeeDisplayVariant('treatment'),
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

      await waitFor(() => {
        expect(
          screen.getByTestId(PerpsOrderViewSelectorsIDs.FEES_VALUE_TAKER),
        ).toHaveTextContent('Taker 0.143% /');
        expect(
          screen.getByTestId(PerpsOrderViewSelectorsIDs.FEES_VALUE_MAKER),
        ).toHaveTextContent('Maker 0.114%');
      });
      expect(calculateFees).toHaveBeenNthCalledWith(1, {
        orderType: 'market',
        isMaker: false,
        amount: '120',
        symbol: 'ETH',
      });
      expect(calculateFees).toHaveBeenNthCalledWith(2, {
        orderType: 'limit',
        isMaker: true,
        amount: '120',
        symbol: 'ETH',
      });
      // The base FEES_VALUE id stays mounted (on the row container) so an
      // E2E readiness wait keyed on it still resolves under treatment.
      expect(
        screen.getByTestId(PerpsOrderViewSelectorsIDs.FEES_VALUE),
      ).toBeOnTheScreen();
    });
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
    {
      label: 'a lifecycle-stale code',
      failure: {
        success: false as const,
        error: PERPS_ERROR_CODES.PROVIDER_LIFECYCLE_STALE,
      },
      messageKey: 'perps.errors.clientReinitializing',
      hiddenText: undefined,
    },
    {
      label: 'a missing error',
      failure: { success: false as const },
      messageKey: 'perps.errors.unknownError',
      hiddenText: undefined,
    },
    {
      label: 'a provider-tagged code whose text is unclassified',
      failure: {
        success: false as const,
        error: 'Hyperliquid signer 0xabc returned an internal stack trace',
        errorCode: PERPS_ERROR_CODES.PROVIDER_LIFECYCLE_STALE,
        errorDetails: {
          code: PERPS_ERROR_CODES.PROVIDER_LIFECYCLE_STALE,
          provider: 'hyperliquid',
        },
      } satisfies OrderResult,
      messageKey: 'perps.errors.clientReinitializing',
      hiddenText: 'Hyperliquid signer 0xabc returned an internal stack trace',
    },
    {
      label: 'unclassified venue text',
      failure: {
        success: false as const,
        error: 'Hyperliquid signer 0xabc returned an internal stack trace',
        errorCode: PERPS_ERROR_CODES.UNKNOWN_ERROR,
        errorDetails: {
          code: PERPS_ERROR_CODES.UNKNOWN_ERROR,
          provider: 'hyperliquid',
        },
      } satisfies OrderResult,
      messageKey: 'perps.errors.unknownError',
      hiddenText: 'Hyperliquid signer 0xabc returned an internal stack trace',
    },
  ])(
    'shows translated TP/SL copy for $label after submitting a market order',
    async ({ failure, messageKey, hiddenText }) => {
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      const updatePositionTPSL = Engine.context.PerpsController
        .updatePositionTPSL as jest.Mock;
      // Once is consumed by any earlier call in the same case, and the
      // following call then resolves success and never shows the error toast.
      updatePositionTPSL.mockResolvedValue(failure);
      const { stream } = renderPerpsOrderView({
        includeToasts: true,
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                ...eligibleOverrides.engine.backgroundState.PerpsController,
                tradeConfigurations: {
                  mainnet: {
                    hyperliquid: {
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
      await waitForEnabledPlaceOrderButton(
        PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON,
      );
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
      if (hiddenText) {
        expect(screen.queryByText(hiddenText)).not.toBeOnTheScreen();
      }
    },
  );

  it('keeps a long order disabled when take profit is below the current price', async () => {
    const placeOrder = jest.mocked(Engine.context.PerpsController.placeOrder);
    const { stream } = renderPerpsOrderView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: {
              ...eligibleOverrides.engine.backgroundState.PerpsController,
              tradeConfigurations: {
                mainnet: {
                  hyperliquid: {
                    ETH: {
                      pendingConfig: {
                        takeProfitPrice: '2000',
                        timestamp: Date.now(),
                      },
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

    expect(
      await screen.findByText(
        strings('perps.tpsl.take_profit_wrong_side_warning', {
          direction: strings('perps.tpsl.above'),
          priceType: 'current',
        }),
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    const placeOrderButton = await screen.findByTestId(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
    expect(placeOrderButton).toBeDisabled();

    fireEvent.press(placeOrderButton);

    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('shows an unavailable liquidation estimate instead of a zero price when Core rejects it', async () => {
    const calculateLiquidationPrice = jest
      .mocked(Engine.context.PerpsController.calculateLiquidationPrice)
      .mockRejectedValue(
        new Error(PERPS_ERROR_CODES.LIQUIDATION_PRICE_UNAVAILABLE),
      );
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

    await waitFor(() => {
      expect(calculateLiquidationPrice).toHaveBeenCalled();
      expect(
        screen.getByTestId(PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_VALUE),
      ).toHaveTextContent(PERPS_CONSTANTS.FallbackDataDisplay);
    });
    expect(
      screen.getByTestId(PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_VALUE),
    ).not.toHaveTextContent('$0');
  });

  it('explains the post-only network-upgrade window when a market order is rejected', async () => {
    const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
    placeOrder.mockResolvedValue({
      success: false,
      error: PERPS_ERROR_CODES.ORDER_POST_ONLY_WINDOW,
    });
    const { stream } = renderPerpsOrderView({
      includeToasts: true,
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

    const placeOrderButton = await waitForEnabledPlaceOrderButton();
    await act(async () => {
      fireEvent.press(placeOrderButton);
    });

    expect(
      await screen.findByText(
        strings('perps.errors.postOnlyWindow'),
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(strings('perps.order.order_failed')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('perps.order.your_funds_have_been_returned_to_you'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryAllByText(/only post-only orders allowed/i),
    ).toHaveLength(0);
    expect(screen.queryAllByText(/\[missing/iu)).toHaveLength(0);
  });

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

    const headerPriceText = (price: number): string =>
      formatPerpsFiat(price, { ranges: PRICE_RANGES_UNIVERSAL });
    const headerChangeText = (percent: number): string =>
      formatPercentage(String(percent));

    const renderTradeSheet = (
      options: {
        initialParams?: Record<string, unknown>;
        streamOverrides?: PerpsStreamOverrides;
      } = {},
    ): ReturnType<typeof renderPerpsOrderView> =>
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

    const findEnabledSubmitButton = (): Promise<
      ReturnType<typeof screen.getByTestId>
    > =>
      waitForEnabledPlaceOrderButton(
        PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON,
      );

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

    it('shows available to trade on the pay with row instead of venue withdrawable', async () => {
      const withdrawableBalance = '400';
      const availableToTrade = 800;
      const availableLabel = formatPerpsFiat(availableToTrade, {
        ranges: PRICE_RANGES_MINIMAL_VIEW,
      });
      const withdrawableLabel = formatPerpsFiat(withdrawableBalance, {
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
            ...createCrossMarginAccountForViews({
              balance: withdrawableBalance,
              accountValue: '1000',
              maintenanceMargin: '100',
              marginUsed: '200',
              notional: '2000',
            }),
            totalBalance: '1000',
          },
          availableToTrade: {
            long: String(availableToTrade),
            short: String(availableToTrade),
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
      expect(
        screen.queryByLabelText(
          `${strings('confirm.label.pay_with')}, ${strings(
            'perps.adjust_margin.perps_balance',
          )} (${withdrawableLabel})`,
        ),
      ).toBeNull();
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

  // Typed amount stays after Done; a pre-layout 0% slider commit must not reset it.
  describe('amount keypad commit', () => {
    const SHORT_BALANCE = '13.67';
    const SHORT_PRICE = '941.95';

    const readDisplayedAmount = (): number =>
      Number(
        screen
          .getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL)
          .findAllByType(Text)
          .map((glyph) => glyph.props.children)
          .join('')
          .replace(/[^0-9.]/g, ''),
      );

    const waitForDisplayedAmount = (expected: number): Promise<void> =>
      waitFor(() => expect(readDisplayedAmount()).toBe(expected), {
        timeout: TIMEOUT_MS,
      });

    const renderShortTradeSheet = async (amount: string): Promise<void> => {
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        initialParams: {
          asset: 'ETH',
          direction: 'short',
          amount,
          leverage: 10,
          useBottomSheet: true,
        },
        streamOverrides: {
          account: accountWithBalance(SHORT_BALANCE),
          positions: [],
          orders: [],
          marketData: [ethMarket],
        },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream, '-2.14', SHORT_PRICE);

      expect(
        await screen.findByTestId(
          PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
    };

    const amountSlider = (): ReturnType<typeof screen.getByTestId> =>
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.AMOUNT_SLIDER);

    const layOutAmountSlider = (): void => {
      fireEvent(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.AMOUNT_SLIDER_LAYOUT),
        'layout',
        {
          nativeEvent: {
            layout: { width: 320, height: 48, x: 0, y: 0 },
          },
        },
      );
    };

    const openAmountKeypad = async (): Promise<void> => {
      fireEvent.press(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      );

      expect(
        await screen.findByTestId(
          PerpsTradeSheetSelectorsIDs.AMOUNT_KEYPAD_DONE_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
    };

    const pressKeypadDigit = (digit: '0' | '1' | '2'): void => {
      const testId = {
        '0': KeypadTestIds.KEY_0,
        '1': KeypadTestIds.KEY_1,
        '2': KeypadTestIds.KEY_2,
      }[digit];

      fireEvent.press(screen.getByTestId(testId));
    };

    const clearKeypadAmount = async (): Promise<void> => {
      const digits = String(Math.trunc(Math.abs(readDisplayedAmount()))).length;

      for (let index = 0; index < digits; index += 1) {
        fireEvent.press(screen.getByTestId(KeypadTestIds.DELETE_BUTTON));
      }

      await waitForDisplayedAmount(0);
    };

    const typeAmount = async (
      digits: readonly ('0' | '1' | '2')[],
    ): Promise<void> => {
      for (const digit of digits) {
        pressKeypadDigit(digit);
      }
    };

    const doneAmountKeypad = (): void => {
      fireEvent.press(
        screen.getByTestId(
          PerpsTradeSheetSelectorsIDs.AMOUNT_KEYPAD_DONE_BUTTON,
        ),
      );
    };

    // Done unmounts the keypad and mounts the slider under the finger that
    // released the button. Android delivers that touch to the new track before
    // it has a width, and a 0-width track maps the touch to 0%.
    const deliverPreLayoutSliderTouch = (): void => {
      fireEvent(amountSlider(), 'valueChange', 0);
      fireEvent(amountSlider(), 'dragEnd', 0);
    };

    it('keeps a typed amount after Done when the size was first set with the slider', async () => {
      await renderShortTradeSheet('0');
      layOutAmountSlider();

      fireEvent(amountSlider(), 'valueChange', 25);
      fireEvent(amountSlider(), 'dragEnd', 25);

      await waitFor(
        () => {
          expect(readDisplayedAmount()).toBeGreaterThan(0);
        },
        { timeout: TIMEOUT_MS },
      );

      await openAmountKeypad();
      await clearKeypadAmount();
      await typeAmount(['1', '0']);
      await waitForDisplayedAmount(10);

      doneAmountKeypad();
      await waitForDisplayedAmount(10);
      deliverPreLayoutSliderTouch();

      await waitForDisplayedAmount(10);
      expect(
        screen.queryByTestId(
          PerpsTradeSheetSelectorsIDs.AMOUNT_KEYPAD_DONE_BUTTON,
        ),
      ).not.toBeOnTheScreen();
      expect(amountSlider().props.accessibilityValue?.text).not.toBe('0%');
    });

    it('keeps a typed amount after Done when the keypad is opened on an empty size', async () => {
      await renderShortTradeSheet('0');
      await openAmountKeypad();
      await typeAmount(['2', '0']);
      await waitForDisplayedAmount(20);

      doneAmountKeypad();
      await waitForDisplayedAmount(20);
      deliverPreLayoutSliderTouch();

      await waitForDisplayedAmount(20);
      expect(
        screen.queryByTestId(
          PerpsTradeSheetSelectorsIDs.AMOUNT_KEYPAD_DONE_BUTTON,
        ),
      ).not.toBeOnTheScreen();
      expect(amountSlider().props.accessibilityValue?.text).not.toBe('0%');
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
    const budgetCeiling = (feeRate: number): number =>
      BALANCE / (1 / LEVERAGE + feeRate);

    const mockQuote = (quote: object): jest.Mock =>
      (
        Engine.context.PerpsController.calculateFees as jest.Mock
      ).mockResolvedValue(quote);

    const renderWithAmount = async (amount: string): Promise<void> => {
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

    const renderAtMax = (): Promise<void> => renderWithAmount(ABOVE_MAX_AMOUNT);

    // The amount renders as one animated Text per glyph, so join their text.
    const readDisplayedAmount = (): number =>
      Number(
        screen
          .getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL)
          .findAllByType(Text)
          .map((glyph) => glyph.props.children)
          .join('')
          .replace(/[^0-9.]/g, ''),
      );

    // Runs while the order form is still mounted, before the order is placed.
    const expectNoBalanceError = (): void => {
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

    const waitForDisplayedAmount = (
      matches: (amount: number) => boolean,
    ): Promise<void> =>
      waitFor(() => expect(matches(readDisplayedAmount())).toBe(true), {
        timeout: TIMEOUT_MS,
      });

    const placeOrderAndReadAmount = async (): Promise<number> => {
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

  const crossAccount = createCrossMarginAccountForViews({
    balance: '1000',
    maintenanceMargin: '200',
    marginUsed: '500',
    notional: '6250',
  });
  const expectedCrossLiquidationPrice = '$2,183.6';
  const mockCrossLiquidationEstimate = (
    estimate: CrossLiquidationEstimate = {
      status: 'price',
      price: '2183.6007130124776',
    },
  ) =>
    jest
      .mocked(Engine.context.PerpsController.estimateCrossLiquidation)
      .mockResolvedValue(estimate);
  const existingCrossPositionStream = {
    account: crossAccount,
    positions: [
      {
        ...defaultPositionForViews,
        liquidationPrice: '1900',
        leverage: { value: 10, type: 'cross' as const },
      },
    ],
    orders: [],
    marketData: [ethMarket],
  };
  const installCrossMarginMarket = () => {
    const getMarkets = jest.mocked(Engine.context.PerpsController.getMarkets);
    const previous = getMarkets.getMockImplementation();
    getMarkets.mockResolvedValue([crossMarginMarketInfo]);
    return () => {
      if (previous) {
        getMarkets.mockImplementation(previous);
      }
    };
  };
  const existingCrossOrderParams = {
    asset: 'ETH',
    direction: 'long' as const,
    amount: '120',
    leverage: 10,
  };

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

    fireEvent.press(await waitForEnabledPlaceOrderButton());

    expect(
      await screen.findByTestId(`route-${Routes.PERPS.MODALS.ROOT}`),
    ).toBeOnTheScreen();
    expect(placeOrder).not.toHaveBeenCalled();
  });

  describe('cross liquidation estimate', () => {
    let restoreMarkets: () => void = () => undefined;

    beforeEach(() => {
      restoreMarkets = installCrossMarginMarket();
      mockCrossLiquidationEstimate();
    });

    afterEach(() => {
      restoreMarkets();
    });

    it('places an order on an existing cross position when cross margin is enabled', async () => {
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      const estimateCrossLiquidation = jest.mocked(
        Engine.context.PerpsController.estimateCrossLiquidation,
      );
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        crossMarginEnabled: true,
        initialParams: existingCrossOrderParams,
        streamOverrides: existingCrossPositionStream,
        extraRoutes: [crossMarginWarningRoute, marketDetailsRoute],
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_VALUE,
          ),
        ).toHaveTextContent(expectedCrossLiquidationPrice);
      });
      expect(estimateCrossLiquidation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          symbol: 'ETH',
          direction: 'long',
          leverage: 10,
          providerId: 'hyperliquid',
        }),
      );

      fireEvent.press(
        screen.getByTestId(
          PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_INFO_ICON,
        ),
      );
      expect(
        await screen.findByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
      ).toHaveTextContent(
        strings('perps.tooltips.cross_liquidation_price.content'),
      );
      expect(
        screen.queryByText(
          strings('perps.tooltips.cross_no_liquidation_price.content'),
        ),
      ).not.toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON),
      );

      const placeOrderButton = await waitForEnabledPlaceOrderButton();
      await act(async () => {
        fireEvent.press(placeOrderButton);
      });

      await waitFor(() => {
        expect(placeOrder).toHaveBeenCalledWith(
          expect.objectContaining({ symbol: 'ETH', isBuy: true }),
        );
      });
      expect(
        screen.queryByTestId(`route-${Routes.PERPS.MODALS.ROOT}`),
      ).not.toBeOnTheScreen();
      await waitForDeferredOrderData();
    });

    it('shows the cross liquidation estimate on a lite cross order', async () => {
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        crossMarginEnabled: true,
        initialParams: { ...existingCrossOrderParams, useBottomSheet: true },
        streamOverrides: existingCrossPositionStream,
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            PerpsTradeSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE,
          ),
        ).toHaveTextContent(expectedCrossLiquidationPrice);
      });
      expect(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
      ).toHaveTextContent(strings('perps.margin_mode.cross_title'));

      fireEvent.press(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.LIQUIDATION_PRICE_ROW),
      );
      expect(
        await screen.findByText(
          strings('perps.tooltips.cross_liquidation_price.content'),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(
          strings('perps.tooltips.cross_no_liquidation_price.content'),
        ),
      ).not.toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.INFO_BACK_BUTTON),
      );
      fireEvent.press(
        await screen.findByTestId(PerpsTradeSheetSelectorsIDs.AUTO_CLOSE_ROW),
      );

      expect(
        await screen.findByTestId(
          PerpsTPSLViewSelectorsIDs.LIQUIDATION_PRICE_VALUE,
        ),
      ).toHaveTextContent(expectedCrossLiquidationPrice);
    });

    it('omits the remaining liquidation price from auto close when a cross reduce does not flip', async () => {
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        crossMarginEnabled: true,
        initialParams: {
          ...existingCrossOrderParams,
          direction: 'short',
          useBottomSheet: true,
        },
        streamOverrides: existingCrossPositionStream,
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            PerpsTradeSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE,
          ),
        ).toHaveTextContent(/\$/);
      });

      fireEvent.press(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.AUTO_CLOSE_ROW),
      );

      expect(
        await screen.findByTestId(
          PerpsTPSLViewSelectorsIDs.LIQUIDATION_PRICE_VALUE,
        ),
      ).toHaveTextContent('--');
    });

    it('shows no liquidation price when a cross order cannot be liquidated', async () => {
      mockCrossLiquidationEstimate({
        status: 'none',
        reason: 'covered_by_account',
      });
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        crossMarginEnabled: true,
        initialParams: existingCrossOrderParams,
        streamOverrides: existingCrossPositionStream,
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_VALUE,
          ),
        ).toHaveTextContent(
          strings('perps.cross_position.no_liquidation_price'),
        );
      });

      fireEvent.press(
        screen.getByTestId(
          PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_INFO_ICON,
        ),
      );
      expect(
        await screen.findByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
      ).toHaveTextContent(
        strings('perps.tooltips.cross_no_liquidation_price.content'),
      );
    });

    it('shows the unavailable explainer when the cross estimate cannot be priced', async () => {
      const estimateCrossLiquidation = mockCrossLiquidationEstimate({
        status: 'unavailable',
        reason: 'provider',
      });
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        crossMarginEnabled: true,
        initialParams: existingCrossOrderParams,
        streamOverrides: existingCrossPositionStream,
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      await waitFor(() => {
        expect(estimateCrossLiquidation).toHaveBeenCalled();
        expect(
          screen.getByTestId(
            PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_VALUE,
          ),
        ).toHaveTextContent(PERPS_CONSTANTS.FallbackDataDisplay);
      });

      fireEvent.press(
        screen.getByTestId(
          PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_INFO_ICON,
        ),
      );
      expect(
        await screen.findByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
      ).toHaveTextContent(
        strings(
          'perps.tooltips.cross_liquidation_estimate_unavailable.content',
        ),
      );
      expect(
        screen.queryByText(
          strings('perps.tooltips.cross_no_liquidation_price.content'),
        ),
      ).not.toBeOnTheScreen();
    });

    it('shows the cross estimate when the market is locked to cross without a position', async () => {
      const estimateCrossLiquidation = jest.mocked(
        Engine.context.PerpsController.estimateCrossLiquidation,
      );
      jest
        .mocked(Engine.context.PerpsController.getMarginModeLock)
        .mockResolvedValue({
          status: 'locked',
          providerId: 'hyperliquid',
          marginMode: 'cross',
          reason: 'open_order',
        });
      const { stream } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        crossMarginEnabled: true,
        initialParams: existingCrossOrderParams,
        streamOverrides: {
          ...existingCrossPositionStream,
          positions: [],
        },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_VALUE,
          ),
        ).toHaveTextContent(expectedCrossLiquidationPrice);
      });
      expect(estimateCrossLiquidation).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH',
          direction: 'long',
          providerId: 'hyperliquid',
        }),
      );
    });
  });

  it('labels the lite trade sheet Isolated for an isolated position', async () => {
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: { ...existingCrossOrderParams, useBottomSheet: true },
      streamOverrides: {
        ...existingCrossPositionStream,
        positions: [
          {
            ...existingCrossPositionStream.positions[0],
            leverage: { value: 10, type: 'isolated' },
          },
        ],
      },
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    expect(
      await screen.findByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
    ).toHaveTextContent(strings('perps.margin_mode.isolated_title'));
  });

  it('labels the lite trade sheet Isolated when no position is open', async () => {
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: { ...existingCrossOrderParams, useBottomSheet: true },
      streamOverrides: {
        ...existingCrossPositionStream,
        positions: [],
      },
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    expect(
      await screen.findByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
    ).toHaveTextContent(strings('perps.margin_mode.isolated_title'));
  });

  it('holds the lite margin label until a cross position arrives', async () => {
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      crossMarginEnabled: true,
      initialParams: { ...existingCrossOrderParams, useBottomSheet: true },
      streamOverrides: {
        ...existingCrossPositionStream,
        positions: null,
      },
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    expect(
      await screen.findByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
    ).toHaveTextContent(PERPS_CONSTANTS.FallbackDataDisplay);
    expect(
      screen.queryByText(strings('perps.margin_mode.cross_title')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.margin_mode.isolated_title')),
    ).not.toBeOnTheScreen();

    await act(async () => {
      stream.emitPositions(existingCrossPositionStream.positions);
    });

    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
    ).toHaveTextContent(strings('perps.margin_mode.cross_title'));
  });

  describe('same symbol open on both venues', () => {
    withLighterBuildEnabled();

    const bothVenues = ({
      activeProvider,
      effectiveProvider,
      defaultProvider = effectiveProvider ?? 'hyperliquid',
      lighter,
      hyperliquid,
    }: {
      activeProvider: 'aggregated' | 'lighter';
      effectiveProvider: 'lighter' | 'hyperliquid' | null;
      defaultProvider?: 'lighter' | 'hyperliquid';
      lighter: Position['leverage'];
      hyperliquid: Position['leverage'];
    }): Required<
      Pick<
        NonNullable<Parameters<typeof renderPerpsOrderView>[0]>,
        'overrides' | 'streamOverrides'
      >
    > => {
      const twoExchange = perpsTwoExchangeState('sameMarketOnBoth');
      const [presetPosition] = twoExchange.streamOverrides.positions ?? [];
      const lighterPosition = createLongPositionForViews({
        ...(presetPosition as Partial<Position>),
        providerId: 'lighter',
        leverage: lighter,
      });

      return {
        overrides: {
          ...twoExchange.overrides,
          engine: {
            ...twoExchange.overrides.engine,
            backgroundState: {
              ...twoExchange.overrides.engine?.backgroundState,
              PerpsController: {
                ...twoExchange.overrides.engine?.backgroundState
                  ?.PerpsController,
                activeProvider,
                defaultProvider,
                effectiveProvider,
              },
            },
          },
        },
        streamOverrides: {
          ...twoExchange.streamOverrides,
          positions: [
            lighterPosition,
            createLongPositionForViews({
              ...lighterPosition,
              providerId: 'hyperliquid',
              leverage: hyperliquid,
            }),
          ],
        },
      };
    };

    it('follows the route provider when it disagrees with the live venue', async () => {
      const { stream } = renderPerpsOrderView({
        ...bothVenues({
          activeProvider: 'aggregated',
          effectiveProvider: 'hyperliquid',
          lighter: { value: 10, type: 'isolated' },
          hyperliquid: { value: 10, type: 'cross' },
        }),
        crossMarginEnabled: true,
        initialParams: {
          ...existingCrossOrderParams,
          useBottomSheet: true,
          providerId: 'lighter',
        },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      expect(
        await screen.findByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
      ).toHaveTextContent(strings('perps.margin_mode.isolated_title'));
    });

    it('labels an aggregated order from the live Lighter venue', async () => {
      const { stream } = renderPerpsOrderView({
        ...bothVenues({
          activeProvider: 'aggregated',
          effectiveProvider: 'lighter',
          lighter: { value: 10, type: 'cross' },
          hyperliquid: { value: 10, type: 'isolated' },
        }),
        crossMarginEnabled: true,
        initialParams: { ...existingCrossOrderParams, useBottomSheet: true },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      expect(
        await screen.findByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
      ).toHaveTextContent(strings('perps.margin_mode.cross_title'));
    });

    it('estimates the cross liquidation against the live venue, not the saved default', async () => {
      const estimateCrossLiquidation = mockCrossLiquidationEstimate();
      const { stream } = renderPerpsOrderView({
        ...bothVenues({
          activeProvider: 'aggregated',
          effectiveProvider: 'lighter',
          defaultProvider: 'hyperliquid',
          lighter: { value: 10, type: 'cross' },
          hyperliquid: { value: 10, type: 'isolated' },
        }),
        crossMarginEnabled: true,
        initialParams: { ...existingCrossOrderParams, useBottomSheet: true },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      await waitFor(() => {
        expect(estimateCrossLiquidation).toHaveBeenCalledWith(
          expect.objectContaining({ symbol: 'ETH', providerId: 'lighter' }),
        );
      });
      expect(estimateCrossLiquidation).not.toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'hyperliquid' }),
      );
    });

    it('labels an aggregated order from the saved default before the live venue resolves', async () => {
      const { stream } = renderPerpsOrderView({
        ...bothVenues({
          activeProvider: 'aggregated',
          effectiveProvider: null,
          defaultProvider: 'hyperliquid',
          lighter: { value: 10, type: 'cross' },
          hyperliquid: { value: 10, type: 'isolated' },
        }),
        crossMarginEnabled: true,
        initialParams: { ...existingCrossOrderParams, useBottomSheet: true },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      expect(
        await screen.findByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
      ).toHaveTextContent(strings('perps.margin_mode.isolated_title'));
    });

    it('labels a direct Lighter order from that venue when the route has none', async () => {
      const { stream } = renderPerpsOrderView({
        ...bothVenues({
          activeProvider: 'lighter',
          effectiveProvider: 'lighter',
          lighter: { value: 10, type: 'isolated' },
          hyperliquid: { value: 10, type: 'cross' },
        }),
        crossMarginEnabled: true,
        initialParams: { ...existingCrossOrderParams, useBottomSheet: true },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      expect(
        await screen.findByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
      ).toHaveTextContent(strings('perps.margin_mode.isolated_title'));
    });

    it('keeps the isolated label when cross margin is off', async () => {
      const { stream } = renderPerpsOrderView({
        ...bothVenues({
          activeProvider: 'aggregated',
          effectiveProvider: 'lighter',
          lighter: { value: 10, type: 'cross' },
          hyperliquid: { value: 10, type: 'isolated' },
        }),
        initialParams: { ...existingCrossOrderParams, useBottomSheet: true },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      expect(
        await screen.findByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_MODE_TAG),
      ).toHaveTextContent(strings('perps.margin_mode.isolated_title'));
    });

    it('places the order when only the other venue is cross', async () => {
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      placeOrder.mockClear();
      const { stream } = renderPerpsOrderView({
        ...bothVenues({
          activeProvider: 'aggregated',
          effectiveProvider: 'lighter',
          lighter: { value: 10, type: 'isolated' },
          hyperliquid: { value: 10, type: 'cross' },
        }),
        initialParams: existingCrossOrderParams,
        extraRoutes: [crossMarginWarningRoute, marketDetailsRoute],
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      fireEvent.press(await waitForEnabledPlaceOrderButton());

      expect(
        screen.queryByTestId(`route-${Routes.PERPS.MODALS.ROOT}`),
      ).not.toBeOnTheScreen();
      await waitFor(() => {
        expect(placeOrder).toHaveBeenCalledWith(
          expect.objectContaining({ symbol: 'ETH', isBuy: true }),
        );
      });
    });
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
        const deliver = (value: OrderBookData): void => {
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
            return (): void => {
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
          return (): void => undefined;
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

      await waitForEnabledPlaceOrderButton();
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

      // The price re-runs order validation behind its real 300ms debounce, so
      // the CTA needs the file's async budget rather than waitFor's 1s default.
      await waitForEnabledPlaceOrderButton();
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

  describe('saved size unit on the real Trade sheet', () => {
    const savedCoinSettings = {
      engine: {
        backgroundState: {
          PerpsController: {
            isEligible: true,
            isFirstTimeUser: { mainnet: false, testnet: false },
            orderBookPreferences: {
              currency: 'base' as const,
              metric: 'total' as const,
            },
          },
        },
      },
    };

    const sizeUnitEvents = (
      events: { name: string; properties: Record<string, unknown> }[],
      name: string,
    ): typeof events => events.filter((event) => event.name === name);

    const orderBookCurrency = (store: {
      getState: () => {
        engine: {
          backgroundState: {
            PerpsController?: {
              orderBookPreferences?: { currency?: string };
            };
          };
        };
      };
    }): string | undefined =>
      store.getState().engine.backgroundState.PerpsController
        ?.orderBookPreferences?.currency;

    it('shows USD and reports usd before the price, then coin once the price can project it', async () => {
      const events: { name: string; properties: Record<string, unknown> }[] =
        [];
      const trackEventSpy = jest
        .spyOn(analytics, 'trackEvent')
        .mockImplementation((event) => {
          events.push({
            name: event.name,
            properties: event.properties as Record<string, unknown>,
          });
        });

      const { stream } = renderPerpsOrderView({
        overrides: {
          ...eligibleOverrides,
          ...savedCoinSettings,
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
      });

      expect(
        await screen.findByRole('button', {
          name: strings('perps.trade_sheet.show_asset_value'),
        }),
      ).toBeOnTheScreen();

      await waitFor(
        () => {
          const considered = sizeUnitEvents(
            events,
            MetaMetricsEvents.PERPS_TRANSACTION_CONSIDERED.category,
          );
          expect(considered.length).toBeGreaterThan(0);
          expect(considered[0].properties[PERPS_ANALYTICS_SIZE_UNIT]).toBe(
            'usd',
          );
        },
        { timeout: TIMEOUT_MS },
      );

      emitEthPrice(stream);

      expect(
        await screen.findByRole('button', {
          name: strings('perps.trade_sheet.show_fiat_value'),
        }),
      ).toBeOnTheScreen();

      fireEvent.press(
        await waitForEnabledPlaceOrderButton(
          PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON,
        ),
      );

      await waitFor(() => {
        const placeOrders = sizeUnitEvents(
          events,
          MetaMetricsEvents.PERPS_UI_INTERACTION.category,
        ).filter(
          (event) =>
            event.properties[PERPS_EVENT_PROPERTY.BUTTON_CLICKED] ===
            PERPS_EVENT_VALUE.BUTTON_CLICKED.PLACE_ORDER,
        );
        expect(placeOrders).toEqual([
          expect.objectContaining({
            properties: expect.objectContaining({
              [PERPS_ANALYTICS_SIZE_UNIT]: 'coin',
            }),
          }),
        ]);
      });

      trackEventSpy.mockRestore();
    });

    it('reports usd on Considered after a pre-price USD edit once the price arrives', async () => {
      const events: { name: string; properties: Record<string, unknown> }[] =
        [];
      const trackEventSpy = jest
        .spyOn(analytics, 'trackEvent')
        .mockImplementation((event) => {
          events.push({
            name: event.name,
            properties: event.properties as Record<string, unknown>,
          });
        });

      const { stream } = renderPerpsOrderView({
        overrides: {
          ...eligibleOverrides,
          ...savedCoinSettings,
        },
        initialParams: {
          asset: 'ETH',
          direction: 'long',
          amount: '0',
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

      fireEvent.press(
        await screen.findByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      );
      fireEvent.press(await screen.findByTestId(KeypadTestIds.KEY_5));
      emitEthPrice(stream);

      expect(
        await screen.findByRole('button', {
          name: strings('perps.trade_sheet.show_asset_value'),
        }),
      ).toBeOnTheScreen();

      await waitFor(
        () => {
          const considered = sizeUnitEvents(
            events,
            MetaMetricsEvents.PERPS_TRANSACTION_CONSIDERED.category,
          );
          expect(considered.length).toBeGreaterThan(0);
          expect(
            considered.every(
              (event) => event.properties[PERPS_ANALYTICS_SIZE_UNIT] === 'usd',
            ),
          ).toBe(true);
        },
        { timeout: TIMEOUT_MS },
      );

      trackEventSpy.mockRestore();
    });

    it('keeps coin sizing after leaving the trade sheet for a tooltip', async () => {
      const amount = '100';
      const price = 2500;
      const szDecimals = 2;
      const coinAmount = formatPositionSize(
        calculatePositionSize({
          amount,
          price,
          szDecimals,
        }),
      );
      const { stream, store } = renderPerpsOrderView({
        overrides: eligibleOverrides,
        initialParams: {
          asset: 'ETH',
          direction: 'long',
          amount,
          leverage: 4,
          useBottomSheet: true,
          defaultSzDecimals: szDecimals,
        },
        streamOverrides: {
          account,
          positions: [],
          orders: [],
          marketData: [ethMarket],
        },
      });
      const unwire = wirePerpsControllerForStore(store);

      try {
        emitEthPrice(stream, '2', String(price));
        // The header can paint a cached mid before order sizing has a price.
        // The coin subtitle appears only once that price can project USD, which
        // is also when the toggle is allowed to persist coin.
        await screen.findByText(
          `${coinAmount} ETH`,
          {},
          { timeout: TIMEOUT_MS },
        );

        fireEvent.press(
          screen.getByTestId(PerpsTradeSheetSelectorsIDs.AMOUNT_TOGGLE),
        );

        expect(
          await screen.findByRole('button', {
            name: strings('perps.trade_sheet.show_fiat_value'),
          }),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
        ).toHaveTextContent(coinAmount);
        expect(
          screen.getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_UNIT_LABEL),
        ).toHaveTextContent('ETH');
        expect(orderBookCurrency(store)).toBe('base');

        fireEvent.press(
          screen.getByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_ROW),
        );

        expect(
          await screen.findByTestId(PerpsTradeSheetSelectorsIDs.INFO_SCREEN),
        ).toBeOnTheScreen();

        fireEvent.press(
          screen.getByTestId(PerpsTradeSheetSelectorsIDs.INFO_BACK_BUTTON),
        );

        expect(
          await screen.findByRole('button', {
            name: strings('perps.trade_sheet.show_fiat_value'),
          }),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
        ).toHaveTextContent(coinAmount);
        expect(
          screen.getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_UNIT_LABEL),
        ).toHaveTextContent('ETH');
        expect(orderBookCurrency(store)).toBe('base');
        expect(
          screen.queryByTestId(PerpsTradeSheetSelectorsIDs.INFO_SCREEN),
        ).not.toBeOnTheScreen();
      } finally {
        unwire();
      }
    });

    it('reports usd on the full-screen form when coin is saved', async () => {
      const events: { name: string; properties: Record<string, unknown> }[] =
        [];
      const trackEventSpy = jest
        .spyOn(analytics, 'trackEvent')
        .mockImplementation((event) => {
          events.push({
            name: event.name,
            properties: event.properties as Record<string, unknown>,
          });
        });

      const { stream } = renderPerpsOrderView({
        overrides: {
          ...eligibleOverrides,
          ...savedCoinSettings,
        },
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

      fireEvent.press(await waitForEnabledPlaceOrderButton());

      await waitFor(() => {
        const placeOrders = sizeUnitEvents(
          events,
          MetaMetricsEvents.PERPS_UI_INTERACTION.category,
        ).filter(
          (event) =>
            event.properties[PERPS_EVENT_PROPERTY.BUTTON_CLICKED] ===
            PERPS_EVENT_VALUE.BUTTON_CLICKED.PLACE_ORDER,
        );
        expect(placeOrders).toEqual([
          expect.objectContaining({
            properties: expect.objectContaining({
              [PERPS_ANALYTICS_SIZE_UNIT]: 'usd',
            }),
          }),
        ]);
      });

      trackEventSpy.mockRestore();
    });
  });

  describe('Money account selection', () => {
    const moneyAccountName = strings(
      'confirm.pay_with_bottom_sheet.money_account',
    );
    const perpsBalanceName = strings('perps.adjust_margin.perps_balance');
    const payWithLabel = strings('confirm.label.pay_with');
    const confirmationTxId = 'perps-cv-confirmation-tx';
    const moneyKeyringId = 'perps-order-money-keyring';
    const moneyAddress = '0x1111111111111111111111111111111111111111';
    // 1,000,000 mUSD in atomic units (6 decimals). Higher than any fixture token.
    const fundedMoneyBalance = '1000000000000';

    type OrderViewStore = ReturnType<typeof renderPerpsOrderView>['store'];

    interface PayControllerStub {
      setTransactionConfig: (
        transactionId: string,
        update: (config: TransactionConfig) => void,
      ) => void;
      updateFiatPayment: () => void;
      updatePaymentToken: () => void;
    }

    let orderViewStore: OrderViewStore | undefined;
    let moneyBalanceFetches = 0;
    let restoreMessenger: (() => void) | undefined;
    let previousPayController: PayControllerStub | undefined;
    let previousFetchGasFeeEstimates: unknown;
    let restoreFlushState: (() => void) | undefined;

    const payControllerKey = 'TransactionPayController';

    const payControllerContext = () =>
      Engine.context as unknown as {
        TransactionPayController?: PayControllerStub;
      };

    const publishPaymentOverride = (
      transactionId: string,
      paymentOverride: PaymentOverride,
    ) => {
      const store = orderViewStore;
      if (!store) {
        return;
      }
      const backgroundState = store.getState().engine.backgroundState as Record<
        string,
        | {
            transactionData?: Record<string, Record<string, unknown>>;
          }
        | undefined
      >;
      const current = backgroundState[payControllerKey] ?? {
        transactionData: {},
      };
      const nextController = {
        ...current,
        transactionData: {
          ...(current.transactionData ?? {}),
          [transactionId]: {
            ...(current.transactionData?.[transactionId] ?? {}),
            paymentOverride,
          },
        },
      };
      const engineWithState = Engine as unknown as {
        state?: Record<string, unknown>;
      };
      engineWithState.state = {
        ...(engineWithState.state ?? {}),
        [payControllerKey]: nextController,
      };
      store.dispatch(updateBgState({ key: payControllerKey }));
    };

    beforeEach(() => {
      moneyBalanceFetches = 0;
      orderViewStore = undefined;
      const messengerCall = Engine.controllerMessenger.call as jest.Mock;
      const previousImplementation = messengerCall.getMockImplementation();
      messengerCall.mockImplementation((action: string, ...args: unknown[]) => {
        if (action === 'MoneyAccountBalanceService:fetchBalanceWithFallback') {
          moneyBalanceFetches += 1;
          return Promise.resolve({
            musdBalance: '0',
            vmusdValueInMusd: fundedMoneyBalance,
            totalBalance: fundedMoneyBalance,
            source: 'api',
            usedFallback: false,
          });
        }
        return previousImplementation
          ? previousImplementation(action, ...args)
          : Promise.resolve(undefined);
      });
      restoreMessenger = () => {
        if (previousImplementation) {
          messengerCall.mockImplementation(previousImplementation);
        } else {
          messengerCall.mockReset();
        }
      };

      const engineContext = payControllerContext();
      previousPayController = engineContext.TransactionPayController;
      engineContext.TransactionPayController = {
        setTransactionConfig(transactionId, update) {
          const config: TransactionConfig = {};
          update(config);
          if (config.paymentOverride) {
            publishPaymentOverride(transactionId, config.paymentOverride);
          }
        },
        updateFiatPayment() {
          return undefined;
        },
        updatePaymentToken() {
          return undefined;
        },
      };

      const gasFeeController = Engine.context.GasFeeController as unknown as {
        fetchGasFeeEstimates?: () => Promise<undefined>;
      };
      previousFetchGasFeeEstimates = gasFeeController.fetchGasFeeEstimates;
      gasFeeController.fetchGasFeeEstimates = async () => undefined;
      const flushState = jest
        .spyOn(EngineService, 'flushState')
        .mockImplementation(() => undefined);
      restoreFlushState = () => {
        flushState.mockRestore();
      };
    });

    afterEach(() => {
      restoreMessenger?.();
      restoreMessenger = undefined;
      const engineContext = payControllerContext();
      if (previousPayController === undefined) {
        delete engineContext.TransactionPayController;
      } else {
        engineContext.TransactionPayController = previousPayController;
      }
      const gasFeeController = Engine.context.GasFeeController as {
        fetchGasFeeEstimates?: unknown;
      };
      if (previousFetchGasFeeEstimates === undefined) {
        delete gasFeeController.fetchGasFeeEstimates;
      } else {
        gasFeeController.fetchGasFeeEstimates = previousFetchGasFeeEstimates;
      }
      restoreFlushState?.();
      restoreFlushState = undefined;
      orderViewStore = undefined;
    });

    const renderMoneyAccountOrder = (streamOverrides: PerpsStreamOverrides) => {
      const result = renderPerpsOrderView({
        overrides: {
          ...eligibleOverrides,
          settings: {
            perpsChartPreferences: {
              preferredCandlePeriod: CandlePeriod.FifteenMinutes,
            },
          },
          engine: {
            backgroundState: {
              ...eligibleOverrides.engine.backgroundState,
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsTradeWithAnyTokenIsEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  confirmations_pay_extended: {
                    enableMoneyAccountTransactions: {
                      perpsDepositAndOrder: true,
                    },
                    defaultPaySelectedSection: {
                      perpsDepositAndOrder: 'money-account',
                    },
                  },
                },
              },
              KeyringController: {
                keyrings: [
                  {
                    type: ExtendedKeyringTypes.hd,
                    accounts: [],
                    metadata: { id: moneyKeyringId, name: '' },
                  },
                ],
              },
              MoneyAccountController: {
                moneyAccounts: {
                  'money-1': {
                    id: 'money-1',
                    address: moneyAddress,
                    type: 'eip155:eoa',
                    scopes: [],
                    methods: [],
                    options: {
                      entropy: {
                        type: 'mnemonic',
                        id: moneyKeyringId,
                        derivationPath: "m/44'/60'/1'/0/0",
                        groupIndex: 0,
                      },
                      exportable: false,
                    },
                  },
                },
              },
              TransactionController: {
                transactions: [
                  {
                    id: confirmationTxId,
                    chainId: '0xa4b1',
                    networkClientId: 'arbitrum-mainnet',
                    status: TransactionStatus.unapproved,
                    time: 0,
                    type: TransactionType.perpsDepositAndOrder,
                    txParams: {
                      from: '0x1234567890123456789012345678901234567890',
                      to: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
                      value: '0x0',
                      data: '0xa9059cbb000000000000000000000000000000000000000000000000000000000000dead0000000000000000000000000000000000000000000000000000000000000000',
                    },
                  },
                ],
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
          positions: [],
          orders: [],
          marketData: [ethMarket],
          ...streamOverrides,
        },
        extraRoutes: [marketDetailsRoute],
      });
      orderViewStore = result.store;
      return result;
    };

    const payWithRow = () =>
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.PAY_WITH_ROW);

    it('keeps Perps balance selected while available to trade has not arrived', async () => {
      const { stream } = renderMoneyAccountOrder({
        account: accountWithBalance('1000'),
        availableToTrade: null,
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      expect(
        await screen.findByTestId(
          PerpsTradeSheetSelectorsIDs.PAY_WITH_SKELETON,
        ),
      ).toBeOnTheScreen();
      // The balance query and the sheet-open callback are the two async gates
      // that would otherwise select the Money account. Wait for both, then
      // assert the hold-back.
      await waitFor(() => {
        expect(moneyBalanceFetches).toBeGreaterThan(0);
      });
      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });

      expect(payWithRow().props.accessibilityLabel).toContain(perpsBalanceName);
      expect(payWithRow().props.accessibilityLabel).not.toContain(
        moneyAccountName,
      );
      expect(screen.queryByText(moneyAccountName)).toBeNull();
    });

    it('selects the Money account once available to trade is zero', async () => {
      const { stream } = renderMoneyAccountOrder({
        account: accountWithBalance('0'),
        availableToTrade: { long: '0', short: '0' },
      });

      await waitForDeferredOrderData();
      emitEthPrice(stream);

      // Money balance query plus the sheet open callback.
      await waitFor(() => {
        expect(payWithRow().props.accessibilityLabel).toContain(
          `${payWithLabel}, ${moneyAccountName}`,
        );
        expect(
          screen.queryByTestId(PerpsTradeSheetSelectorsIDs.PAY_WITH_SKELETON),
        ).toBeNull();
      });

      expect(
        screen.getByText(moneyAccountName, { exact: false }),
      ).toBeOnTheScreen();
      expect(payWithRow().props.accessibilityLabel).not.toContain(
        perpsBalanceName,
      );
    });
  });
});
