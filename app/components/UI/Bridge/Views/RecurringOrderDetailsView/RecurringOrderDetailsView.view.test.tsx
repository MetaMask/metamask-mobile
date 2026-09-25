import '../../../../../../tests/component-view/mocks';
import { userEvent, waitFor, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  renderBridgeViewWithRecurringOrderDetails,
  renderRecurringOrderDetailsView,
} from '../../../../../../tests/component-view/renderers/bridge';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { BridgeViewSelectorsIDs } from '../BridgeView/BridgeView.testIds';
import { MOCK_RECURRING_OPEN_ORDER } from './RecurringOrderDetailsView.mock';
import ToastService from '../../../../../core/ToastService';
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
    renderResult.getByTestId(
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

describeForPlatforms('RecurringOrderDetailsView', () => {
  const showToast = jest.fn();

  beforeEach(() => {
    showToast.mockClear();
    ToastService.toastRef = {
      current: {
        showToast,
        closeToast: jest.fn(),
      },
    };
  });

  afterEach(() => {
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
      cancelSheetScope.getByText(strings('bridge.recurring.cancel_order')),
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
    ).toHaveTextContent(
      `${MOCK_RECURRING_OPEN_ORDER.filledAmount} / ${MOCK_RECURRING_OPEN_ORDER.totalSourceAmount} (40%)`,
    );
    for (const swap of MOCK_RECURRING_OPEN_ORDER.swaps) {
      expect(
        renderResult.getByTestId(
          RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(swap.swapId),
        ),
      ).toBeOnTheScreen();
    }
  });

  it('returns from a missing order fallback without showing actions', async () => {
    const renderResult = renderRecurringOrderDetailsView({
      orderId: 'unknown-recurring-order',
    });

    await userEvent.press(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
      ),
    );

    expect(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.NOT_FOUND,
      ),
    ).toHaveTextContent(strings('bridge.recurring.order_not_found'));
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

    await userEvent.press(
      renderResult.getByTestId(
        RecurringOrderDetailsViewSelectorsIDs.BACK_BUTTON,
      ),
    );

    expect(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
      ),
    ).toBeOnTheScreen();
  });
});
