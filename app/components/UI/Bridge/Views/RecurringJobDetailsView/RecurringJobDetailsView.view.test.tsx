import '../../../../../../tests/component-view/mocks';
import { userEvent, waitFor, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  renderBridgeViewWithRecurringJobDetails,
  renderRecurringJobDetailsView,
} from '../../../../../../tests/component-view/renderers/bridge';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { BridgeViewSelectorsIDs } from '../BridgeView/BridgeView.testIds';
import { MOCK_RECURRING_OPEN_JOB } from './RecurringJobDetailsView.mock';
import { RecurringJobDetailsViewSelectorsIDs } from './RecurringJobDetailsView.testIds';

async function openInProgressJobDetails(
  renderResult: ReturnType<typeof renderBridgeViewWithRecurringJobDetails>,
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
      RecurringJobDetailsViewSelectorsIDs.OPEN_JOB_ROW(
        MOCK_RECURRING_OPEN_JOB.jobId,
      ),
    ),
  );
  await waitFor(() => {
    expect(
      renderResult.getByTestId(RecurringJobDetailsViewSelectorsIDs.SCREEN),
    ).toBeOnTheScreen();
  });
}

describeForPlatforms('RecurringJobDetailsView', () => {
  it('dismisses cancel confirmation without changing the in-progress Job', async () => {
    const renderResult = renderBridgeViewWithRecurringJobDetails();
    await openInProgressJobDetails(renderResult);

    expect(
      renderResult.queryByTestId(
        RecurringJobDetailsViewSelectorsIDs.CANCEL_SHEET,
      ),
    ).not.toBeOnTheScreen();

    await userEvent.press(
      renderResult.getByTestId(
        RecurringJobDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    );

    const cancelSheet = await renderResult.findByTestId(
      RecurringJobDetailsViewSelectorsIDs.CANCEL_SHEET,
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
        RecurringJobDetailsViewSelectorsIDs.CANCEL_SHEET_CLOSE_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      cancelSheetScope.getByTestId(
        RecurringJobDetailsViewSelectorsIDs.CANCEL_SHEET_CONFIRM_BUTTON,
      ),
    ).toBeOnTheScreen();

    await userEvent.press(
      cancelSheetScope.getByTestId(
        RecurringJobDetailsViewSelectorsIDs.CANCEL_SHEET_CLOSE_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(
          RecurringJobDetailsViewSelectorsIDs.CANCEL_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });

    await userEvent.press(
      renderResult.getByTestId(
        RecurringJobDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    );
    await userEvent.press(
      await renderResult.findByTestId(
        RecurringJobDetailsViewSelectorsIDs.CANCEL_SHEET_CONFIRM_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(
          RecurringJobDetailsViewSelectorsIDs.CANCEL_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });
    expect(
      renderResult.getByTestId(
        RecurringJobDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByTestId(
        RecurringJobDetailsViewSelectorsIDs.FILLED_VALUE,
      ),
    ).toHaveTextContent(
      `${MOCK_RECURRING_OPEN_JOB.filledAmount} / ${MOCK_RECURRING_OPEN_JOB.totalSourceAmount} (40%)`,
    );
    for (const order of MOCK_RECURRING_OPEN_JOB.orders) {
      expect(
        renderResult.getByTestId(
          RecurringJobDetailsViewSelectorsIDs.HISTORY_ROW(order.orderId),
        ),
      ).toBeOnTheScreen();
    }
  });

  it('returns from a missing Job fallback without showing actions', async () => {
    const renderResult = renderRecurringJobDetailsView({
      jobId: 'unknown-recurring-job',
    });

    await userEvent.press(
      renderResult.getByTestId(
        RecurringJobDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
      ),
    );

    expect(
      await renderResult.findByTestId(
        RecurringJobDetailsViewSelectorsIDs.NOT_FOUND,
      ),
    ).toHaveTextContent(strings('bridge.recurring.order_not_found'));
    expect(
      renderResult.queryByTestId(
        RecurringJobDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    ).not.toBeOnTheScreen();
    expect(
      renderResult.queryByTestId(
        RecurringJobDetailsViewSelectorsIDs.DUPLICATE_BUTTON,
      ),
    ).not.toBeOnTheScreen();

    await userEvent.press(
      renderResult.getByTestId(RecurringJobDetailsViewSelectorsIDs.BACK_BUTTON),
    );

    expect(
      await renderResult.findByTestId(
        RecurringJobDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
      ),
    ).toBeOnTheScreen();
  });
});
