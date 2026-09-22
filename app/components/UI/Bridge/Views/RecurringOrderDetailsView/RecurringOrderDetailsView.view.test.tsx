import '../../../../../../tests/component-view/mocks';
import {
  act,
  fireEvent,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  renderBridgeViewWithRecurringOrderDetails,
  renderRecurringOrderDetailsView,
} from '../../../../../../tests/component-view/renderers/bridge';
import {
  clearRecurringOrdersDataServiceMock,
  setupRecurringOrdersDataServiceMock,
} from '../../../../../../tests/component-view/api-mocking/recurringOrders';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { BridgeViewSelectorsIDs } from '../BridgeView/BridgeView.testIds';
import {
  MOCK_RECURRING_CANCELLED_ORDER,
  MOCK_RECURRING_COMPLETED_ORDER,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
} from '../../api/recurringOrders.mock';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from '../../api/recurringSwaps.mock';
import type { GetRecurringSwapsResponse } from '../../api/recurringOrders.types';
import { formatRecurringPriceRange } from '../../utils/recurringOrders';
import ToastService from '../../../../../core/ToastService';
import { RecurringSwapDetailsViewSelectorsIDs } from '../RecurringSwapDetailsView';
import { RecurringOrderDetailsViewSelectorsIDs } from './RecurringOrderDetailsView.testIds';

async function openInProgressOrderDetails(
  renderResult: ReturnType<typeof renderBridgeViewWithRecurringOrderDetails>,
) {
  await userEvent.press(
    renderResult.getByTestId(BridgeViewSelectorsIDs.RECURRING_TAB),
  );
  await waitFor(() => {
    expect(
      renderResult.getByTestId(BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER),
    ).toBeOnTheScreen();
  });

  await userEvent.press(
    await renderResult.findByTestId(
      RecurringOrderDetailsViewSelectorsIDs.OPEN_ORDER_ROW(
        MOCK_RECURRING_OPEN_ORDER.orderId,
      ),
    ),
  );
  await waitFor(() => {
    expect(
      renderResult.getByTestId(RecurringOrderDetailsViewSelectorsIDs.SCREEN),
    ).toBeOnTheScreen();
  });
}

async function openOrderDetails(
  renderResult: ReturnType<typeof renderRecurringOrderDetailsView>,
) {
  await userEvent.press(
    renderResult.getByTestId(
      RecurringOrderDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
    ),
  );
  await waitFor(() => {
    expect(
      renderResult.getByTestId(RecurringOrderDetailsViewSelectorsIDs.HISTORY),
    ).toBeOnTheScreen();
  });
}

describeForPlatforms('RecurringOrderDetailsView', () => {
  const showToast = jest.fn();

  beforeEach(() => {
    setupRecurringOrdersDataServiceMock();
    showToast.mockClear();
    ToastService.toastRef = {
      current: {
        showToast,
        closeToast: jest.fn(),
      },
    };
  });

  afterEach(() => {
    clearRecurringOrdersDataServiceMock();
    ToastService.resetForTesting();
  });

  it('dismisses cancel confirmation without changing the in-progress order', async () => {
    const renderResult = renderBridgeViewWithRecurringOrderDetails();
    await openInProgressOrderDetails(renderResult);

    expect(
      renderResult.queryByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET,
      ),
    ).not.toBeOnTheScreen();

    await userEvent.press(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    );

    const cancelSheet = await renderResult.findByTestId(
      RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET,
    );
    const cancelSheetScope = within(cancelSheet);
    expect(
      cancelSheetScope.getByText(
        strings('bridge.recurring.cancel_confirmation_title'),
      ),
    ).toBeOnTheScreen();
    expect(
      cancelSheetScope.getByText(
        strings('bridge.recurring.cancel_confirmation_body'),
      ),
    ).toBeOnTheScreen();
    expect(
      cancelSheetScope.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET_CLOSE_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      cancelSheetScope.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET_CONFIRM_BUTTON,
      ),
    ).toBeOnTheScreen();

    await userEvent.press(
      cancelSheetScope.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET_CLOSE_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(
          RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });
    expect(showToast).not.toHaveBeenCalled();

    await userEvent.press(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    );
    await userEvent.press(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET_CONFIRM_BUTTON,
      ),
    );

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label: strings('bridge.recurring.order_canceled_toast_title'),
            isBold: true,
          },
        ],
      }),
    );

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(
          RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });
    expect(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.FILLED_VALUE,
      ),
    ).toHaveTextContent('0.003 / 0.0075 ETH (40%)');
  });

  it('shows every attempted swap from the API history', async () => {
    const renderResult = renderRecurringOrderDetailsView({
      order: MOCK_RECURRING_OPEN_ORDER,
    });
    await openOrderDetails(renderResult);

    const expectedRows = [
      {
        swap: MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
        status: strings('bridge.recurring.filled'),
        received: '+3 USDC',
        spent: '-0.0015 ETH',
      },
      {
        swap: MOCK_RECURRING_OPEN_ORDER_SWAPS[1],
        status: strings('bridge.recurring.filled'),
        received: '+3 USDC',
        spent: '-0.0015 ETH',
      },
      {
        swap: MOCK_RECURRING_OPEN_ORDER_SWAPS[2],
        status: strings('bridge.recurring.insufficient_balance'),
        received: '+0 USDC',
        spent: '-0 ETH',
      },
      {
        swap: MOCK_RECURRING_OPEN_ORDER_SWAPS[3],
        status: strings('bridge.recurring.out_of_price_range'),
        received: '+0 USDC',
        spent: '-0 ETH',
      },
      {
        swap: MOCK_RECURRING_OPEN_ORDER_SWAPS[4],
        status: strings('bridge.recurring.failed'),
        received: '+0 USDC',
        spent: '-0 ETH',
      },
      {
        swap: MOCK_RECURRING_OPEN_ORDER_SWAPS[5],
        status: strings('bridge.recurring.needs_smart_account'),
        received: '+0 USDC',
        spent: '-0 ETH',
      },
    ];

    for (const { swap, status, received, spent } of expectedRows) {
      const row = within(
        await renderResult.findByTestId(
          RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(swap.swapId),
        ),
      );

      expect(
        row.getByText(
          strings('bridge.recurring.pair', {
            source: 'ETH',
            dest: 'USDC',
          }),
        ),
      ).toBeOnTheScreen();
      expect(row.getByText(status)).toBeOnTheScreen();
      expect(row.getByText(received)).toBeOnTheScreen();
      expect(row.getByText(spent)).toBeOnTheScreen();
    }
    expect(
      renderResult.getByText(
        strings('bridge.recurring.history_progress', {
          filledOrderCount: 2,
          totalOrderCount: 5,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('opens swap details when a history row is pressed', async () => {
    const renderResult = renderRecurringOrderDetailsView({
      order: MOCK_RECURRING_OPEN_ORDER,
    });
    await openOrderDetails(renderResult);

    await userEvent.press(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(
          MOCK_RECURRING_OPEN_ORDER_SWAPS[0].swapId,
        ),
      ),
    );

    expect(
      await renderResult.findByTestId(
        RecurringSwapDetailsViewSelectorsIDs.SCREEN,
      ),
    ).toBeOnTheScreen();
  });

  it('shows an empty state when the order has no attempted swaps', async () => {
    const renderResult = renderRecurringOrderDetailsView({
      order: MOCK_RECURRING_OPEN_ORDER_2,
    });

    await openOrderDetails(renderResult);

    expect(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.HISTORY_EMPTY,
      ),
    ).toHaveTextContent(strings('bridge.recurring.history_empty'));
  });

  it('keeps the price range in USD when EUR is selected', async () => {
    const renderResult = renderRecurringOrderDetailsView({
      order: MOCK_RECURRING_OPEN_ORDER,
      overrides: {
        engine: {
          backgroundState: {
            CurrencyRateController: {
              currentCurrency: 'EUR',
              currencyRates: {
                ETH: {
                  conversionRate: 1800,
                  usdConversionRate: 2000,
                },
              },
            },
            AssetsController: {
              selectedCurrency: 'eur',
            },
          },
        },
      },
    });

    await openOrderDetails(renderResult);

    const summary = within(
      renderResult.getByTestId(RecurringOrderDetailsViewSelectorsIDs.SUMMARY),
    );
    expect(
      summary.getByText(
        formatRecurringPriceRange({
          priceRange: MOCK_RECURRING_OPEN_ORDER.priceRange,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('uses failed copy when a skipped swap has no reason', async () => {
    const malformedSkippedSwap = {
      ...MOCK_RECURRING_OPEN_ORDER_SWAPS[2],
      skipReason: undefined,
    };
    clearRecurringOrdersDataServiceMock();
    setupRecurringOrdersDataServiceMock({
      recurringSwaps: jest
        .fn()
        .mockResolvedValue({ swaps: [malformedSkippedSwap] }),
    });
    const renderResult = renderRecurringOrderDetailsView({
      order: MOCK_RECURRING_OPEN_ORDER,
    });

    await openOrderDetails(renderResult);

    const row = await renderResult.findByTestId(
      RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(
        malformedSkippedSwap.swapId,
      ),
    );
    expect(
      within(row).getByText(strings('bridge.recurring.failed')),
    ).toBeOnTheScreen();
  });

  it('recovers swap history after the initial request fails', async () => {
    let rejectInitialRequest: (reason: Error) => void = () => undefined;
    const initialRequest = new Promise<GetRecurringSwapsResponse>(
      (_resolve, reject) => {
        rejectInitialRequest = reject;
      },
    );
    const recurringSwaps = jest
      .fn()
      .mockReturnValueOnce(initialRequest)
      .mockResolvedValueOnce({ swaps: [MOCK_RECURRING_OPEN_ORDER_SWAPS[0]] });
    clearRecurringOrdersDataServiceMock();
    setupRecurringOrdersDataServiceMock({ recurringSwaps });
    const renderResult = renderRecurringOrderDetailsView({
      order: MOCK_RECURRING_OPEN_ORDER,
    });

    await openOrderDetails(renderResult);
    expect(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.HISTORY_LOADING,
      ),
    ).toBeOnTheScreen();

    await act(async () => {
      rejectInitialRequest(new Error('History failed'));
      await Promise.resolve();
    });

    const historyError = await renderResult.findByTestId(
      RecurringOrderDetailsViewSelectorsIDs.HISTORY_ERROR,
    );
    expect(
      within(historyError).getByText(strings('bridge.recurring.history_error')),
    ).toBeOnTheScreen();

    await userEvent.press(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.HISTORY_RETRY_BUTTON,
      ),
    );

    expect(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(
          MOCK_RECURRING_OPEN_ORDER_SWAPS[0].swapId,
        ),
      ),
    ).toBeOnTheScreen();
    expect(recurringSwaps).toHaveBeenCalledTimes(2);
  });

  it('loads the next history page near the bottom of the details scroll', async () => {
    let resolveNextPage: (value: GetRecurringSwapsResponse) => void = () =>
      undefined;
    const nextPage = new Promise<GetRecurringSwapsResponse>((resolve) => {
      resolveNextPage = resolve;
    });
    const recurringSwaps = jest
      .fn()
      .mockResolvedValueOnce({
        swaps: [MOCK_RECURRING_OPEN_ORDER_SWAPS[0]],
        nextCursor: 'next-page',
      })
      .mockReturnValueOnce(nextPage);
    clearRecurringOrdersDataServiceMock();
    setupRecurringOrdersDataServiceMock({ recurringSwaps });
    const renderResult = renderRecurringOrderDetailsView({
      order: MOCK_RECURRING_OPEN_ORDER,
    });
    await openOrderDetails(renderResult);
    await renderResult.findByTestId(
      RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(
        MOCK_RECURRING_OPEN_ORDER_SWAPS[0].swapId,
      ),
    );

    fireEvent.scroll(renderResult.UNSAFE_getByType(ScrollView), {
      nativeEvent: {
        contentSize: { height: 1000, width: 300 },
        layoutMeasurement: { height: 500, width: 300 },
        contentOffset: { x: 0, y: 450 },
      },
    });

    expect(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.HISTORY_NEXT_PAGE_LOADING,
      ),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveNextPage({ swaps: [MOCK_RECURRING_OPEN_ORDER_SWAPS[1]] });
      await Promise.resolve();
    });

    expect(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(
          MOCK_RECURRING_OPEN_ORDER_SWAPS[1].swapId,
        ),
      ),
    ).toBeOnTheScreen();
    expect(recurringSwaps).toHaveBeenNthCalledWith(
      2,
      MOCK_RECURRING_OPEN_ORDER.orderId,
      { limit: 20, cursor: 'next-page' },
    );
  });

  it('shows duplicate action for a completed API order', async () => {
    const renderResult = renderRecurringOrderDetailsView({
      order: MOCK_RECURRING_COMPLETED_ORDER,
    });

    await userEvent.press(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
      ),
    );

    expect(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.DUPLICATE_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      renderResult.queryByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows no footer action for a cancelled API order', async () => {
    const renderResult = renderRecurringOrderDetailsView({
      order: MOCK_RECURRING_CANCELLED_ORDER,
    });

    await userEvent.press(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
      ),
    );

    expect(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.SUMMARY,
      ),
    ).toBeOnTheScreen();
    expect(
      renderResult.queryByTestId(
        RecurringOrderDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    ).not.toBeOnTheScreen();
    expect(
      renderResult.queryByTestId(
        RecurringOrderDetailsViewSelectorsIDs.DUPLICATE_BUTTON,
      ),
    ).not.toBeOnTheScreen();
  });
});
