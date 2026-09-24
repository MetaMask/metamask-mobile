import '../../../../tests/component-view/mocks';
import {
  fireEvent,
  waitFor,
  within,
  type RenderAPI,
} from '@testing-library/react-native';
import {
  FeatureId,
  type GenericQuoteRequest,
} from '@metamask/bridge-controller';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import StorageWrapper from '../../../store/storage-wrapper';
import { QUICK_BUY_QUICK_AMOUNT_PREFS_KEY } from './hooks/useQuickBuyQuickAmountPreferences';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  QUICK_BUY_QUOTE_TOTAL_FOR_10_USD,
  clearQuickBuyApiMocks,
  createQuickBuyFetchedQuote,
  setupQuickBuyApiMock,
} from '../../../../tests/component-view/api-mocking/quickBuy';
import { renderQuickBuySheet } from '../../../../tests/component-view/renderers/quickBuy';
import { getRouteProbeTestId } from '../../../../tests/component-view/render';
import {
  quickBuySellableUsdcOverrides,
  quickBuyUsdtPayWithOverrides,
  quickBuyZeroEthOverrides,
} from '../../../../tests/component-view/presets/quickBuy';
import { USDT_DEST } from '../Bridge/_mocks_/bridgeViewTestConstants';
import Routes from '../../../constants/navigation/Routes';
import {
  getQuickBuyBuyPillTestId,
  getQuickBuyChainFilterTestId,
  getQuickBuyEditBuyFieldTestId,
  getQuickBuyPayWithRowTestId,
  getQuickBuySellPillTestId,
  QuickBuySheetSelectorsIDs,
} from './QuickBuySheet.testIds';

const BASE_CHAIN_ID = '0x2105';
const BASE_USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

const WAIT_MS = 8000;

const mockFetchQuotes = (
  impl?: (
    params: GenericQuoteRequest,
  ) => ReturnType<typeof createQuickBuyFetchedQuote>[],
) => {
  (Engine.context.BridgeController.fetchQuotes as jest.Mock).mockImplementation(
    async (params: GenericQuoteRequest) =>
      impl
        ? impl(params)
        : [
            createQuickBuyFetchedQuote(String(params.srcTokenAmount ?? '0'), {
              destAddress: params.destTokenAddress,
            }),
          ],
  );
};

const waitForSheetReady = async (
  screen: Pick<RenderAPI, 'findByTestId' | 'getByTestId'>,
) => {
  await screen.findByTestId(QuickBuySheetSelectorsIDs.CONTENT_CONTAINER);

  await waitFor(
    () => {
      const payWith = screen.getByTestId(
        QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON,
      );
      expect(within(payWith).getByText(/ETH/)).toBeOnTheScreen();
    },
    { timeout: WAIT_MS },
  );
};

const waitForConfirmEnabled = async (
  screen: Pick<RenderAPI, 'getByTestId'>,
) => {
  await waitFor(
    () => {
      expect(
        screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON).props
          .accessibilityState?.disabled,
      ).toBe(false);
    },
    { timeout: WAIT_MS },
  );
};

const waitForQuoteTotal = async (screen: Pick<RenderAPI, 'getByTestId'>) => {
  await waitFor(
    () => {
      const rateTag = screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_TAG);
      expect(
        within(rateTag).getByText(QUICK_BUY_QUOTE_TOTAL_FOR_10_USD),
      ).toBeOnTheScreen();
    },
    { timeout: WAIT_MS },
  );
};

const selectTenDollarBuy = async (
  screen: Pick<RenderAPI, 'findByTestId' | 'getByTestId'>,
) => {
  await waitForSheetReady(screen);
  fireEvent.press(await screen.findByTestId(getQuickBuyBuyPillTestId(10)));
};

/** Local Quick Buy path: BridgeController.fetchQuotes, not Redux quote polling. */
const expectDirectFetchQuotes = (featureId: FeatureId) => {
  expect(Engine.context.BridgeController.fetchQuotes).toHaveBeenCalled();
  const lastCall = (
    Engine.context.BridgeController.fetchQuotes as jest.Mock
  ).mock.calls.at(-1);
  expect(lastCall?.[0]).toEqual(
    expect.objectContaining({
      srcTokenAmount: expect.stringMatching(/^[1-9]/),
    }),
  );
  expect(lastCall?.[1]).toBe(featureId);
  expect(
    Engine.context.BridgeController.updateBridgeQuoteRequestParams,
  ).not.toHaveBeenCalled();
};

describeForPlatforms('QuickBuySheet', () => {
  beforeEach(() => {
    setupQuickBuyApiMock();
    mockFetchQuotes();
  });

  afterEach(async () => {
    clearQuickBuyApiMocks();
    await StorageWrapper.removeItem(QUICK_BUY_QUICK_AMOUNT_PREFS_KEY);
    jest.clearAllMocks();
  });

  it('shows the pay-with row after the sheet opens', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);

    const payWith = screen.getByTestId(
      QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON,
    );
    expect(within(payWith).getByText(/ETH/)).toBeOnTheScreen();
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_AREA),
    ).toBeOnTheScreen();
  });

  it('updates the fiat amount when the user types on the keypad', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.KEYPAD_KEY_1),
    );

    const amountArea = await screen.findByTestId(
      QuickBuySheetSelectorsIDs.AMOUNT_AREA,
    );
    await waitFor(() => {
      expect(within(amountArea).getByText('1')).toBeOnTheScreen();
    });
  });

  it('shows the total row after a quote loads', async () => {
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);

    await waitForQuoteTotal(screen);
  });

  it('enables confirm when a valid amount and quote are available', async () => {
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);

    await waitForConfirmEnabled(screen);
  });

  it('fetches quotes through BridgeController.fetchQuotes after a buy pill is selected', async () => {
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);

    expectDirectFetchQuotes(FeatureId.UNKNOWN);
  });

  it('maps leaderboard analytics source to QUICK_BUY_FOLLOW_TRADING on fetchQuotes', async () => {
    const screen = renderQuickBuySheet({
      analyticsContext: { source: 'leaderboard' },
    });

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);

    expectDirectFetchQuotes(FeatureId.QUICK_BUY_FOLLOW_TRADING);
  });

  it('keeps confirm disabled when fetchQuotes returns no quotes', async () => {
    mockFetchQuotes(() => []);
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);

    await waitFor(
      () => {
        expect(Engine.context.BridgeController.fetchQuotes).toHaveBeenCalled();
      },
      { timeout: WAIT_MS },
    );
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
    expect(screen.queryByText(QUICK_BUY_QUOTE_TOTAL_FOR_10_USD)).toBeNull();
  });

  it('keeps confirm disabled when fetchQuotes rejects', async () => {
    (
      Engine.context.BridgeController.fetchQuotes as jest.Mock
    ).mockRejectedValue(new Error('quote fetch failed'));
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);

    await waitFor(
      () => {
        expect(Engine.context.BridgeController.fetchQuotes).toHaveBeenCalled();
      },
      { timeout: WAIT_MS },
    );
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
    expect(
      Engine.context.BridgeController.updateBridgeQuoteRequestParams,
    ).not.toHaveBeenCalled();
  });

  it('opens the pay-with token list when the pay-with row is pressed', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    );

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER),
    ).toBeOnTheScreen();
  });

  it('returns to the amount screen when pay-with back is pressed', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    );
    await screen.findByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER);

    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BACK),
    );

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER),
    ).not.toBeOnTheScreen();
  });

  it('opens quote details when the rate tag is pressed', async () => {
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_TAG_PRESSABLE),
    );

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.EDIT_SLIPPAGE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_ROW),
    ).toBeOnTheScreen();
  });

  it('returns from quote details when the sub-screen back button is pressed', async () => {
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_TAG_PRESSABLE),
    );
    await screen.findByTestId(QuickBuySheetSelectorsIDs.EDIT_SLIPPAGE);

    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.SUB_SCREEN_BACK),
    );

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.RATE_TAG),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.EDIT_SLIPPAGE),
    ).not.toBeOnTheScreen();
  });

  it('opens edit quick amounts from the toolbar', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);
    await waitFor(
      () => {
        expect(
          screen.getByTestId(QuickBuySheetSelectorsIDs.EDIT_AMOUNTS_BUTTON)
            .props.accessibilityState?.disabled,
        ).toBe(false);
      },
      { timeout: WAIT_MS },
    );
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.EDIT_AMOUNTS_BUTTON),
    );

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.EDIT_AMOUNTS_CONFIRM),
    ).toBeOnTheScreen();
  });

  it('opens the high price impact screen instead of submitting', async () => {
    mockFetchQuotes((params) => [
      createQuickBuyFetchedQuote(String(params.srcTokenAmount ?? '0'), {
        priceImpactAmount: '0.30',
        destAddress: params.destTokenAddress,
      }),
    ]);
    const submitSpy = jest.spyOn(
      Engine.context.BridgeStatusController,
      'submitTx',
    );
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);
    await waitForConfirmEnabled(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(
      await screen.findByTestId(
        QuickBuySheetSelectorsIDs.PRICE_IMPACT_DESCRIPTION,
      ),
    ).toBeOnTheScreen();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('submits the high-impact trade after the user proceeds', async () => {
    mockFetchQuotes((params) => [
      createQuickBuyFetchedQuote(String(params.srcTokenAmount ?? '0'), {
        priceImpactAmount: '0.30',
        destAddress: params.destTokenAddress,
      }),
    ]);
    const submitSpy = jest.spyOn(
      Engine.context.BridgeStatusController,
      'submitTx',
    );
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);
    await waitForConfirmEnabled(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON),
    );
    await screen.findByTestId(
      QuickBuySheetSelectorsIDs.PRICE_IMPACT_DESCRIPTION,
    );
    fireEvent.press(await screen.findByText(strings('bridge.proceed')));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalled();
    });
  });

  it('submits the trade via Engine when confirm is pressed', async () => {
    const submitSpy = jest.spyOn(
      Engine.context.BridgeStatusController,
      'submitTx',
    );
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);
    await waitForConfirmEnabled(screen);
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON),
    );

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalled();
    });
    expectDirectFetchQuotes(FeatureId.UNKNOWN);
  });

  it('switches to sell pills when Sell is pressed', async () => {
    const screen = renderQuickBuySheet({
      overrides: quickBuySellableUsdcOverrides(),
    });

    await waitForSheetReady(screen);
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.TRADE_MODE_TOGGLE),
    );

    expect(
      await screen.findByTestId(getQuickBuySellPillTestId(25)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getQuickBuyBuyPillTestId(10)),
    ).not.toBeOnTheScreen();
  });

  it('picks a receive token in sell mode and returns to the amount screen', async () => {
    const screen = renderQuickBuySheet({
      overrides: quickBuySellableUsdcOverrides(),
    });

    await waitForSheetReady(screen);
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.TRADE_MODE_TOGGLE),
    );
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    );
    const usdtRow = await screen.findByTestId(
      getQuickBuyPayWithRowTestId(USDT_DEST.address, USDT_DEST.chainId),
    );
    fireEvent.press(usdtRow);

    const payWith = await screen.findByTestId(
      QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON,
    );
    expect(within(payWith).getByText(/USDT/)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER),
    ).not.toBeOnTheScreen();
  });

  it('updates the pay-with token after a different held token is selected', async () => {
    const screen = renderQuickBuySheet({
      overrides: quickBuyUsdtPayWithOverrides(),
    });

    await waitForSheetReady(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    );
    fireEvent.press(
      await screen.findByTestId(
        getQuickBuyPayWithRowTestId(USDT_DEST.address, USDT_DEST.chainId),
      ),
    );

    const payWith = await screen.findByTestId(
      QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON,
    );
    expect(within(payWith).getByText(/USDT/)).toBeOnTheScreen();
  });

  it('filters receive tokens to one chain and hides the others', async () => {
    const screen = renderQuickBuySheet({
      overrides: quickBuySellableUsdcOverrides(),
    });
    const mainnetUsdtRow = getQuickBuyPayWithRowTestId(
      USDT_DEST.address,
      USDT_DEST.chainId,
    );
    const baseUsdcRow = getQuickBuyPayWithRowTestId(
      BASE_USDC_ADDRESS,
      BASE_CHAIN_ID,
    );

    await waitForSheetReady(screen);
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.TRADE_MODE_TOGGLE),
    );
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    );
    await screen.findByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER);
    fireEvent.press(
      await screen.findByTestId(getQuickBuyChainFilterTestId(null)),
    );
    expect(await screen.findByTestId(mainnetUsdtRow)).toBeOnTheScreen();
    expect(screen.getByTestId(baseUsdcRow)).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(getQuickBuyChainFilterTestId(BASE_CHAIN_ID)),
    );

    expect(await screen.findByTestId(baseUsdcRow)).toBeOnTheScreen();
    expect(screen.queryByTestId(mainnetUsdtRow)).not.toBeOnTheScreen();
  });

  it('saves an edited buy pill and shows it on the amount screen', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);
    await waitFor(
      () => {
        expect(
          screen.getByTestId(QuickBuySheetSelectorsIDs.EDIT_AMOUNTS_BUTTON)
            .props.accessibilityState?.disabled,
        ).toBe(false);
      },
      { timeout: WAIT_MS },
    );
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.EDIT_AMOUNTS_BUTTON),
    );
    await screen.findByTestId(QuickBuySheetSelectorsIDs.EDIT_AMOUNTS_CONFIRM);
    fireEvent.press(screen.getByTestId(getQuickBuyEditBuyFieldTestId(0)));
    fireEvent.press(screen.getByTestId(QuickBuySheetSelectorsIDs.KEYPAD_KEY_2));
    fireEvent.press(screen.getByTestId(QuickBuySheetSelectorsIDs.KEYPAD_KEY_0));
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.EDIT_AMOUNTS_CONFIRM),
    );

    expect(
      await screen.findByTestId(getQuickBuyBuyPillTestId(20)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getQuickBuyBuyPillTestId(10)),
    ).not.toBeOnTheScreen();
  });

  it('keeps the keypad inert and shows Add funds when the wallet is empty', async () => {
    const screen = renderQuickBuySheet({
      overrides: quickBuyZeroEthOverrides(),
    });

    await screen.findByTestId(QuickBuySheetSelectorsIDs.DISABLED_KEYPAD);
    fireEvent.press(screen.getByTestId(QuickBuySheetSelectorsIDs.KEYPAD_KEY_1));

    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.DISABLED_AMOUNT),
    ).toBeOnTheScreen();
    expect(
      within(
        screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_AREA),
      ).queryByText('1'),
    ).toBeNull();
    expect(
      within(
        screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON),
      ).getByText(strings('social_leaderboard.quick_buy.add_funds')),
    ).toBeOnTheScreen();
  });

  it('shows quote detail fields after a quote loads', async () => {
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_TAG_PRESSABLE),
    );
    const slippage = await screen.findByTestId(
      QuickBuySheetSelectorsIDs.EDIT_SLIPPAGE,
    );

    expect(within(slippage).getByText('Auto')).toBeOnTheScreen();
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_ROW),
    ).toBeOnTheScreen();
    expect(screen.getAllByText(/USDC/).length).toBeGreaterThan(0);
  });

  it('opens the slippage modal from quote details', async () => {
    const screen = renderQuickBuySheet({
      extraRoutes: [{ name: Routes.BRIDGE.MODALS.ROOT }],
    });

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_TAG_PRESSABLE),
    );
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.EDIT_SLIPPAGE),
    );

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.BRIDGE.MODALS.ROOT)),
    ).toBeOnTheScreen();
  });

  it('maps token details analytics source to QUICK_BUY_TOKEN_DETAILS on fetchQuotes', async () => {
    const screen = renderQuickBuySheet({
      analyticsContext: { source: 'asset_details' },
    });

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);

    expectDirectFetchQuotes(FeatureId.QUICK_BUY_TOKEN_DETAILS);
  });

  it('maps explore analytics source to QUICK_BUY_EXPLORE on fetchQuotes', async () => {
    const screen = renderQuickBuySheet({
      analyticsContext: { source: 'explore_crypto' },
    });

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);

    expectDirectFetchQuotes(FeatureId.QUICK_BUY_EXPLORE);
  });

  it('returns to the amount screen when high-impact cancel is pressed', async () => {
    mockFetchQuotes((params) => [
      createQuickBuyFetchedQuote(String(params.srcTokenAmount ?? '0'), {
        priceImpactAmount: '0.30',
        destAddress: params.destTokenAddress,
      }),
    ]);
    const submitSpy = jest.spyOn(
      Engine.context.BridgeStatusController,
      'submitTx',
    );
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);
    await waitForConfirmEnabled(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON),
    );
    await screen.findByTestId(
      QuickBuySheetSelectorsIDs.PRICE_IMPACT_DESCRIPTION,
    );
    fireEvent.press(await screen.findByText(strings('bridge.cancel')));

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.PRICE_IMPACT_DESCRIPTION),
    ).not.toBeOnTheScreen();
    expect(submitSpy).not.toHaveBeenCalled();
  });
});
