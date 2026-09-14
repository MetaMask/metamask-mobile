import '../../../../tests/component-view/mocks';
import {
  act,
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
import { updateBgState } from '../../../core/redux/slices/engine';
import { strings } from '../../../../locales/i18n';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  QUICK_BUY_QUOTE_TOTAL_FOR_10_USD,
  clearQuickBuyApiMocks,
  createQuickBuyStoreQuote,
  setupQuickBuyApiMock,
} from '../../../../tests/component-view/api-mocking/quickBuy';
import { renderQuickBuySheet } from '../../../../tests/component-view/renderers/quickBuy';
import {
  getQuickBuyBuyPillTestId,
  QuickBuySheetSelectorsIDs,
} from './QuickBuySheet.testIds';

const WAIT_MS = 8000;

interface QuoteStore {
  getState: () => {
    engine: {
      backgroundState: { BridgeController: Record<string, unknown> };
    };
  };
  dispatch: (action: ReturnType<typeof updateBgState>) => void;
}

const applyBridgeQuotes = (
  store: QuoteStore,
  quotes: ReturnType<typeof createQuickBuyStoreQuote>[],
  quoteFetchError: string | null = null,
) => {
  const existing = store.getState().engine.backgroundState.BridgeController;
  const engine = Engine as unknown as { state?: Record<string, unknown> };
  engine.state = {
    ...(engine.state ?? {}),
    BridgeController: {
      ...existing,
      quotes,
      recommendedQuote: quotes[0] ?? null,
      quotesLastFetched: Date.now(),
      quotesLoadingStatus: quoteFetchError ? 'ERROR' : 'SUCCEEDED',
      quoteFetchError,
      quoteStreamComplete: { hasQuotes: quotes.length > 0 },
    },
  };
  act(() => {
    store.dispatch(updateBgState({ key: 'BridgeController' }));
  });
};

const mockUpdateQuoteRequest = (
  store: QuoteStore,
  impl?: (
    params: GenericQuoteRequest,
  ) => ReturnType<typeof createQuickBuyStoreQuote>[],
) => {
  (
    Engine.context.BridgeController.updateBridgeQuoteRequestParams as jest.Mock
  ).mockImplementation(async (params: GenericQuoteRequest) => {
    const quotes = impl
      ? impl(params)
      : [createQuickBuyStoreQuote(String(params.srcTokenAmount ?? '0'))];
    applyBridgeQuotes(store, quotes);
  });
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

/** SwapQuotes path: Redux quoteRequest, not local fetchQuotes. */
const expectQuoteRequest = async (featureId: FeatureId) => {
  await waitFor(
    () => {
      expect(
        Engine.context.BridgeController.updateBridgeQuoteRequestParams,
      ).toHaveBeenCalled();
    },
    { timeout: WAIT_MS },
  );
  const lastCall = (
    Engine.context.BridgeController.updateBridgeQuoteRequestParams as jest.Mock
  ).mock.calls.at(-1);
  expect(lastCall?.[0]).toEqual(
    expect.objectContaining({
      srcTokenAmount: expect.stringMatching(/^[1-9]/),
    }),
  );
  expect(lastCall?.[1]).toEqual(
    expect.objectContaining({
      feature_id: featureId,
    }),
  );
  expect(Engine.context.BridgeController.fetchQuotes).not.toHaveBeenCalled();
};

const renderSheet = (
  options?: Parameters<typeof renderQuickBuySheet>[0],
  impl?: (
    params: GenericQuoteRequest,
  ) => ReturnType<typeof createQuickBuyStoreQuote>[],
) => {
  const screen = renderQuickBuySheet(options);
  mockUpdateQuoteRequest(screen.store, impl);
  return screen;
};

describeForPlatforms('QuickBuySheet', () => {
  beforeEach(() => {
    setupQuickBuyApiMock();
  });

  afterEach(() => {
    clearQuickBuyApiMocks();
    jest.clearAllMocks();
  });

  it('shows the pay-with row after the sheet opens', async () => {
    const screen = renderSheet();

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
    const screen = renderSheet();

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
    const screen = renderSheet();

    await selectTenDollarBuy(screen);

    await waitForQuoteTotal(screen);
  });

  it('enables confirm when a valid amount and quote are available', async () => {
    const screen = renderSheet();

    await selectTenDollarBuy(screen);

    await waitForConfirmEnabled(screen);
  });

  it('requests quotes through updateBridgeQuoteRequestParams after a buy pill is selected', async () => {
    const screen = renderSheet();

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);

    await expectQuoteRequest(FeatureId.UNKNOWN);
  });

  it('maps leaderboard analytics source to QUICK_BUY_FOLLOW_TRADING on the quote request', async () => {
    const screen = renderSheet({
      analyticsContext: { source: 'leaderboard' },
    });

    await selectTenDollarBuy(screen);
    await waitForQuoteTotal(screen);

    await expectQuoteRequest(FeatureId.QUICK_BUY_FOLLOW_TRADING);
  });

  it('keeps confirm disabled when the quote request returns no quotes', async () => {
    const screen = renderSheet(undefined, () => []);

    await selectTenDollarBuy(screen);

    await waitFor(
      () => {
        expect(
          Engine.context.BridgeController.updateBridgeQuoteRequestParams,
        ).toHaveBeenCalled();
      },
      { timeout: WAIT_MS },
    );
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
    expect(screen.queryByText(QUICK_BUY_QUOTE_TOTAL_FOR_10_USD)).toBeNull();
  });

  it('keeps confirm disabled when the quote request rejects', async () => {
    const screen = renderQuickBuySheet();
    (
      Engine.context.BridgeController
        .updateBridgeQuoteRequestParams as jest.Mock
    ).mockImplementation(async () => {
      applyBridgeQuotes(screen.store, [], 'quote fetch failed');
    });

    await selectTenDollarBuy(screen);

    await waitFor(
      () => {
        expect(
          Engine.context.BridgeController.updateBridgeQuoteRequestParams,
        ).toHaveBeenCalled();
      },
      { timeout: WAIT_MS },
    );
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
    expect(Engine.context.BridgeController.fetchQuotes).not.toHaveBeenCalled();
  });

  it('opens the pay-with token list when the pay-with row is pressed', async () => {
    const screen = renderSheet();

    await waitForSheetReady(screen);
    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON),
    );

    expect(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.PAY_WITH_HEADER),
    ).toBeOnTheScreen();
  });

  it('returns to the amount screen when pay-with back is pressed', async () => {
    const screen = renderSheet();

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
    const screen = renderSheet();

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
    const screen = renderSheet();

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
    const screen = renderSheet();

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
    const screen = renderSheet({ onClose });

    await waitForSheetReady(screen);
    fireEvent.press(screen.getByTestId(QuickBuySheetSelectorsIDs.CLOSE_BUTTON));

    expect(onClose).toHaveBeenCalled();
  });

  it('opens the high price impact screen instead of submitting', async () => {
    const submitSpy = jest.spyOn(
      Engine.context.BridgeStatusController,
      'submitTx',
    );
    const screen = renderSheet(undefined, (params) => [
      createQuickBuyStoreQuote(String(params.srcTokenAmount ?? '0'), {
        priceImpactAmount: '0.30',
      }),
    ]);

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
    const submitSpy = jest.spyOn(
      Engine.context.BridgeStatusController,
      'submitTx',
    );
    const screen = renderSheet(undefined, (params) => [
      createQuickBuyStoreQuote(String(params.srcTokenAmount ?? '0'), {
        priceImpactAmount: '0.30',
      }),
    ]);

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
    const screen = renderSheet();

    await selectTenDollarBuy(screen);
    await waitForConfirmEnabled(screen);
    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON),
    );

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalled();
    });
    await expectQuoteRequest(FeatureId.UNKNOWN);
  });
});
