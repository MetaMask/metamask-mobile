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
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  QUICK_BUY_QUOTE_TOTAL_FOR_10_USD,
  clearQuickBuyApiMocks,
  createQuickBuyFetchedQuote,
  setupQuickBuyApiMock,
} from '../../../../tests/component-view/api-mocking/quickBuy';
import { renderQuickBuySheet } from '../../../../tests/component-view/renderers/quickBuy';
import {
  getQuickBuyBuyPillTestId,
  QuickBuySheetSelectorsIDs,
} from './QuickBuySheet.testIds';

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
        : [createQuickBuyFetchedQuote(String(params.srcTokenAmount ?? '0'))],
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

  it('calls onClose when the toolbar close button is pressed', async () => {
    const onClose = jest.fn();
    const screen = renderQuickBuySheet({ onClose });

    await waitForSheetReady(screen);
    fireEvent.press(screen.getByTestId(QuickBuySheetSelectorsIDs.CLOSE_BUTTON));

    expect(onClose).toHaveBeenCalled();
  });

  it('opens the high price impact screen instead of submitting', async () => {
    mockFetchQuotes((params) => [
      createQuickBuyFetchedQuote(String(params.srcTokenAmount ?? '0'), {
        priceImpactAmount: '0.30',
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
});
