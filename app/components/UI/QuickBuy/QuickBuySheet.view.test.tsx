import '../../../../tests/component-view/mocks';
import { merge } from 'lodash';
import {
  fireEvent,
  waitFor,
  within,
  type RenderAPI,
} from '@testing-library/react-native';
import {
  DiscountType,
  FeatureId,
  type GenericQuoteRequest,
} from '@metamask/bridge-controller';
import { Text, TextColor } from '@metamask/design-system-react-native';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  QUICK_BUY_QUOTE_TOTAL_FOR_10_USD,
  clearQuickBuyApiMocks,
  createQuickBuyFetchedQuote,
  setupQuickBuyApiMock,
} from '../../../../tests/component-view/api-mocking/quickBuy';
import { renderQuickBuySheet } from '../../../../tests/component-view/renderers/quickBuy';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../tests/component-view/render';
import {
  quickBuySellableUsdcOverrides,
  quickBuyUsdtPayWithOverrides,
  quickBuyZeroEthOverrides,
} from '../../../../tests/component-view/presets/quickBuy';
import {
  USDC_DEST,
  USDT_DEST,
} from '../Bridge/_mocks_/bridgeViewTestConstants';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import Routes from '../../../constants/navigation/Routes';
import { getAssetTestId } from '../../../../tests/selectors/Wallet/WalletView.selectors';
import {
  getQuickBuyBuyPillTestId,
  getQuickBuySellPillTestId,
  QuickBuySheetSelectorsIDs,
} from './QuickBuySheet.testIds';

const USDT_PICKER_ROW = getAssetTestId(`${USDT_DEST.chainId}-USDT`);
const BASE_NETWORK_OPTION = 'network-option-eip155:8453';
const SLIPPAGE_ROUTE = {
  name: Routes.BRIDGE.MODALS.ROOT,
  Component: createRouteParamsProbe(Routes.BRIDGE.MODALS.ROOT),
};

const findTextColor = (
  screen: Pick<RenderAPI, 'UNSAFE_getAllByType'>,
  amountPattern: RegExp,
): TextColor | undefined => {
  const amountText = screen.UNSAFE_getAllByType(Text).find((node) => {
    const { children } = node.props;
    return typeof children === 'string' && amountPattern.test(children);
  });
  return amountText?.props.color as TextColor | undefined;
};

const typeAmount = (screen: Pick<RenderAPI, 'getByTestId'>, digits: string) => {
  for (const digit of digits) {
    fireEvent.press(screen.getByTestId(`keypad-key-${digit}`));
  }
};

const expectSlippageModal = async (
  screen: Pick<RenderAPI, 'findByTestId'>,
  sourceChainId: string,
  destChainId: string,
) => {
  const paramsNode = await screen.findByTestId(
    getRouteParamsProbeTestId(Routes.BRIDGE.MODALS.ROOT),
  );
  expect(JSON.parse(String(paramsNode.props.children))).toEqual({
    screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
    params: { sourceChainId, destChainId },
  });
};

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
      expect(rateTag).toBeOnTheScreen();
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

  afterEach(() => {
    clearQuickBuyApiMocks();
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

  it('shows the estimated receive row after a gasless quote loads', async () => {
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);

    await waitForQuoteTotal(screen);
    expect(screen.getByText('-$2 for gas')).toBeOnTheScreen();
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
    expect(
      screen.getByText(strings('social_leaderboard.quick_buy.receive')),
    ).toBeOnTheScreen();
    // USDT is not in the balance fixture, so its row proves Receive is not balance-only.
    const usdtRow = await screen.findByTestId(USDT_PICKER_ROW);
    expect(
      screen.queryByTestId(getAssetTestId(`${USDC_DEST.chainId}-USDC`)),
    ).not.toBeOnTheScreen();
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
    fireEvent.press(await screen.findByTestId(USDT_PICKER_ROW));

    const payWith = await screen.findByTestId(
      QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON,
    );
    expect(within(payWith).getByText(/USDT/)).toBeOnTheScreen();
  });

  it('lists held tokens but not the token being bought in the pay-with list', async () => {
    const screen = renderQuickBuySheet({
      overrides: merge(
        quickBuyUsdtPayWithOverrides(),
        quickBuySellableUsdcOverrides(),
      ),
    });

    await waitForSheetReady(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    );

    expect(await screen.findByTestId(USDT_PICKER_ROW)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getAssetTestId(`${USDC_DEST.chainId}-USDC`)),
    ).not.toBeOnTheScreen();
  });

  it('filters the picker by the network chosen in the network list', async () => {
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
    await screen.findByTestId(USDT_PICKER_ROW);
    fireEvent.press(screen.getByTestId('network-pills-more-button'));

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.NETWORK_LIST_HEADER),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(BASE_NETWORK_OPTION));

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.queryByTestId(USDT_PICKER_ROW)).not.toBeOnTheScreen();
    });
  });

  it('opens the slippage modal from the settings button', async () => {
    const screen = renderQuickBuySheet({
      extraRoutes: [SLIPPAGE_ROUTE],
    });

    await waitForSheetReady(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.SETTINGS_BUTTON),
    );

    await expectSlippageModal(screen, '0x1', '0x1');
  });

  it('omits chains without a balance from the buy network filter', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    );
    await screen.findByTestId('bridge-token-search-input');

    // One held chain fits in the pills, so the in-sheet list is not offered.
    expect(screen.queryByTestId('network-pills-more-button')).toBeNull();
    expect(screen.queryByText('Base')).toBeNull();
    expect(screen.queryByText('Optimism')).toBeNull();
  });

  it('keeps the network filter on back and clears it from All networks', async () => {
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
    await screen.findByTestId(USDT_PICKER_ROW);
    fireEvent.press(screen.getByTestId('network-pills-more-button'));
    fireEvent.press(await screen.findByTestId(BASE_NETWORK_OPTION));

    await screen.findByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER);
    await waitFor(() => {
      expect(screen.queryByTestId(USDT_PICKER_ROW)).not.toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('network-pills-more-button'));
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.NETWORK_LIST_BACK),
    );

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(USDT_PICKER_ROW)).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('network-pills-more-button'));
    fireEvent.press(await screen.findByTestId('network-option-all'));

    expect(await screen.findByTestId(USDT_PICKER_ROW)).toBeOnTheScreen();
  });

  it('hides the trade mode toggle when the position token has no balance', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);

    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.TRADE_MODE_TOGGLE),
    ).toBeNull();
    expect(
      screen.getByText(
        strings('social_leaderboard.quick_buy.title', { symbol: 'USDC' }),
      ),
    ).toBeOnTheScreen();
  });

  it('hides the trade mode toggle when sell is not enabled', async () => {
    const screen = renderQuickBuySheet({
      overrides: quickBuySellableUsdcOverrides(),
      features: { ...TOP_TRADERS_QUICK_BUY_FEATURES, tradeModes: ['buy'] },
    });

    await waitForSheetReady(screen);

    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.TRADE_MODE_TOGGLE),
    ).toBeNull();
  });

  it('opens in sell mode when initialTradeMode is sell', async () => {
    const screen = renderQuickBuySheet({
      initialTradeMode: 'sell',
      overrides: quickBuySellableUsdcOverrides(),
    });

    expect(
      await screen.findByTestId(getQuickBuySellPillTestId(25)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getQuickBuyBuyPillTestId(10)),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('social_leaderboard.quick_buy.sell_title', { symbol: 'USDC' }),
      ),
    ).toBeOnTheScreen();
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

  it('shows Add funds without a quote skeleton when the typed amount exceeds the balance', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);
    // Exceeds both the cached 10 ETH and the mocked 100 ETH RPC balance at $2000.
    fireEvent.press(screen.getByTestId(QuickBuySheetSelectorsIDs.KEYPAD_KEY_1));
    for (let i = 0; i < 6; i += 1) {
      fireEvent.press(screen.getByTestId('keypad-key-0'));
    }

    const amountArea = screen.getByTestId(
      QuickBuySheetSelectorsIDs.AMOUNT_AREA,
    );
    expect(
      await within(amountArea).findByText(
        strings('social_leaderboard.quick_buy.add_funds'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.EST_RECEIVE_LOADING),
    ).not.toBeOnTheScreen();

    const confirm = screen.getByTestId(
      QuickBuySheetSelectorsIDs.CONFIRM_BUTTON,
    );
    expect(
      within(confirm).getByText(
        strings('social_leaderboard.quick_buy.add_funds'),
      ),
    ).toBeOnTheScreen();
    expect(confirm.props.accessibilityState?.disabled).toBe(false);
  });

  it('keeps Sell disabled without relabelling when the typed amount exceeds the balance', async () => {
    const screen = renderQuickBuySheet({
      overrides: quickBuySellableUsdcOverrides(),
    });

    await waitForSheetReady(screen);
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.TRADE_MODE_TOGGLE),
    );
    await screen.findByTestId(getQuickBuySellPillTestId(25));
    // balanceOf is mocked as 2 ETH wei for every token, so USDC's live balance
    // is 2e12 units. Type past that.
    typeAmount(screen, '3000000000000');

    const amountArea = screen.getByTestId(
      QuickBuySheetSelectorsIDs.AMOUNT_AREA,
    );
    expect(await within(amountArea).findByText(/Available/)).toBeOnTheScreen();
    expect(
      within(amountArea).queryByText(
        strings('social_leaderboard.quick_buy.add_funds'),
      ),
    ).toBeNull();
    await waitFor(() => {
      expect(findTextColor(screen, /^3000000000000$/)).toBe(
        TextColor.ErrorDefault,
      );
    });

    const confirm = screen.getByTestId(
      QuickBuySheetSelectorsIDs.CONFIRM_BUTTON,
    );
    expect(
      within(confirm).getByText(
        strings('social_leaderboard.trader_position.sell'),
      ),
    ).toBeOnTheScreen();
    expect(confirm.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows the available balance in sell mode', async () => {
    const screen = renderQuickBuySheet({
      overrides: quickBuySellableUsdcOverrides(),
    });

    await waitForSheetReady(screen);
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.TRADE_MODE_TOGGLE),
    );

    const amountArea = screen.getByTestId(
      QuickBuySheetSelectorsIDs.AMOUNT_AREA,
    );
    expect(
      await within(amountArea).findByText(/^100 .*Available$/),
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

  const openQuoteDetails = async (
    gasIncluded: boolean,
    metabridgeFee?: {
      quoteBpsFee: number;
      baseBpsFee: number;
      discountType: string;
    },
  ) => {
    mockFetchQuotes((params) => [
      createQuickBuyFetchedQuote(String(params.srcTokenAmount ?? '0'), {
        destAddress: params.destTokenAddress,
        gasIncluded,
        metabridgeFee,
      }),
    ]);
    const screen = renderQuickBuySheet();

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_TAG_PRESSABLE),
    );
    await screen.findByTestId(QuickBuySheetSelectorsIDs.EDIT_SLIPPAGE);
    return screen;
  };

  it('shows the fee token chip in quote details for gasless quotes', async () => {
    const screen = await openQuoteDetails(true);

    expect(
      within(
        screen.getByTestId(QuickBuySheetSelectorsIDs.GASLESS_FEE_TOKEN),
      ).getByText('ETH'),
    ).toBeOnTheScreen();
  });

  it('hides the fee token chip in quote details for regular quotes', async () => {
    const screen = await openQuoteDetails(false);

    expect(
      screen.getByText(strings('social_leaderboard.quick_buy.metamask_fee')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.GASLESS_FEE_TOKEN),
    ).not.toBeOnTheScreen();
  });

  it('shows a discounted MetaMask fee with its badge and struck-through base fee', async () => {
    const screen = await openQuoteDetails(true, {
      quoteBpsFee: 0,
      baseBpsFee: 87.5,
      discountType: DiscountType.PROMO,
    });

    expect(
      screen.getByText(strings('bridge.discount_badge_promo')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('bridge.fee_percentage', { feePercentage: 0.875 }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('0%')).toBeOnTheScreen();
  });

  it('opens the slippage modal from quote details', async () => {
    const screen = renderQuickBuySheet({
      extraRoutes: [SLIPPAGE_ROUTE],
    });

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_TAG_PRESSABLE),
    );
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.EDIT_SLIPPAGE),
    );

    await expectSlippageModal(screen, '0x1', '0x1');
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
