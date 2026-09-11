import '../../../../tests/component-view/mocks';
import {
  fireEvent,
  waitFor,
  within,
  type RenderAPI,
} from '@testing-library/react-native';
import type { GenericQuoteRequest } from '@metamask/bridge-controller';
import Engine from '../../../core/Engine';
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

function mockFetchQuotes() {
  (Engine.context.BridgeController.fetchQuotes as jest.Mock).mockImplementation(
    async (params: GenericQuoteRequest) => [
      createQuickBuyFetchedQuote(String(params.srcTokenAmount ?? '0')),
    ],
  );
}

async function waitForSheetReady(
  screen: Pick<RenderAPI, 'findByTestId' | 'getByTestId'>,
) {
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
}

async function waitForConfirmEnabled(screen: Pick<RenderAPI, 'getByTestId'>) {
  await waitFor(
    () => {
      expect(
        screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON).props
          .accessibilityState?.disabled,
      ).toBe(false);
    },
    { timeout: WAIT_MS },
  );
}

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

    await waitForSheetReady(screen);
    fireEvent.press(await screen.findByTestId(getQuickBuyBuyPillTestId(10)));

    await waitFor(
      () => {
        const rateTag = screen.getByTestId(QuickBuySheetSelectorsIDs.RATE_TAG);
        expect(
          within(rateTag).getByText(QUICK_BUY_QUOTE_TOTAL_FOR_10_USD),
        ).toBeOnTheScreen();
      },
      { timeout: WAIT_MS },
    );
  });

  it('enables confirm when a valid amount and quote are available', async () => {
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);
    fireEvent.press(await screen.findByTestId(getQuickBuyBuyPillTestId(10)));

    await waitForConfirmEnabled(screen);
  });

  it('submits the trade via Engine when confirm is pressed', async () => {
    const submitSpy = jest.spyOn(
      Engine.context.BridgeStatusController,
      'submitTx',
    );
    const screen = renderQuickBuySheet();

    await waitForSheetReady(screen);
    fireEvent.press(await screen.findByTestId(getQuickBuyBuyPillTestId(10)));

    await waitForConfirmEnabled(screen);

    fireEvent.press(
      await screen.findByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON),
    );

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalled();
    });
  });
});
