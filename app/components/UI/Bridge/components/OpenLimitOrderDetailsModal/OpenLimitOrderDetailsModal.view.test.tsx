import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderOpenLimitOrderDetailsModal } from '../../../../../../tests/component-view/renderers/bridge';
import { CancelLimitOrderModalSelectorsIDs } from '../CancelLimitOrderModal/testIds';
import { OpenLimitOrderDetailsModalSelectorsIDs } from './testIds';

const {
  SHEET,
  STATUS,
  SUBMITTED,
  TRIGGER_CONDITION,
  TRIGGER_COMPARISON,
  EXPIRY,
  CANCEL_ORDER_BUTTON,
} = OpenLimitOrderDetailsModalSelectorsIDs;

// Values the screen is currently hard-coded with. These assertions are the
// contract that has to be revisited when the sheet is wired to a real order.
const MOCKED_SUBMITTED_AMOUNT = '0.1 ETH';
const MOCKED_TRIGGER_PRICE = '@ $3,412.20';
const MOCKED_EXPIRY = '7 days';

describeForPlatforms('OpenLimitOrderDetailsModal', () => {
  it('shows every detail of the open order', async () => {
    const { findByTestId, getByTestId, getByText } =
      renderOpenLimitOrderDetailsModal();

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(
      getByText(strings('bridge.limit.pair', { source: 'ETH', dest: 'WBTC' })),
    ).toBeOnTheScreen();

    const statusRow = getByTestId(STATUS);
    expect(
      within(statusRow).getByText(strings('bridge.limit.status')),
    ).toBeOnTheScreen();
    expect(
      within(statusRow).getByText(strings('bridge.limit.in_progress')),
    ).toBeOnTheScreen();

    const submittedRow = getByTestId(SUBMITTED);
    expect(
      within(submittedRow).getByText(strings('bridge.limit.submitted')),
    ).toBeOnTheScreen();
    expect(
      within(submittedRow).getByText(MOCKED_SUBMITTED_AMOUNT),
    ).toBeOnTheScreen();

    const triggerRow = getByTestId(TRIGGER_CONDITION);
    expect(
      within(triggerRow).getByText(strings('bridge.limit.trigger_condition')),
    ).toBeOnTheScreen();
    expect(
      within(triggerRow).getByText(MOCKED_TRIGGER_PRICE),
    ).toBeOnTheScreen();

    const expiryRow = getByTestId(EXPIRY);
    expect(
      within(expiryRow).getByText(strings('bridge.limit.expiry_label')),
    ).toBeOnTheScreen();
    expect(within(expiryRow).getByText(MOCKED_EXPIRY)).toBeOnTheScreen();
  });

  it('compares the trigger price against the market price', async () => {
    const { findByTestId } = renderOpenLimitOrderDetailsModal();

    const comparison = await findByTestId(TRIGGER_COMPARISON);

    expect(comparison).toHaveTextContent(
      strings('bridge.limit.from_market', { percent: '4.95' }),
    );
  });

  it('opens the cancel order sheet from the details sheet', async () => {
    const { findByTestId, getByTestId } = renderOpenLimitOrderDetailsModal();

    await act(async () => {
      fireEvent.press(await findByTestId(CANCEL_ORDER_BUTTON));
    });

    const cancelSheet = await findByTestId(
      CancelLimitOrderModalSelectorsIDs.SHEET,
    );
    expect(cancelSheet).toBeOnTheScreen();
    expect(
      getByTestId(CancelLimitOrderModalSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(strings('bridge.limit.cancel_order_confirmation'));
    expect(
      getByTestId(CancelLimitOrderModalSelectorsIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('returns to the details sheet once the cancellation is confirmed', async () => {
    const { findByTestId, queryByTestId } = renderOpenLimitOrderDetailsModal();

    await act(async () => {
      fireEvent.press(await findByTestId(CANCEL_ORDER_BUTTON));
    });
    await act(async () => {
      fireEvent.press(
        await findByTestId(CancelLimitOrderModalSelectorsIDs.CONFIRM_BUTTON),
      );
    });

    expect(
      queryByTestId(CancelLimitOrderModalSelectorsIDs.SHEET),
    ).not.toBeOnTheScreen();
    expect(await findByTestId(SHEET)).toBeOnTheScreen();
  });

  it('returns to the details sheet when the cancel sheet is dismissed', async () => {
    const { findByTestId, queryByTestId } = renderOpenLimitOrderDetailsModal();

    await act(async () => {
      fireEvent.press(await findByTestId(CANCEL_ORDER_BUTTON));
    });
    await act(async () => {
      fireEvent.press(
        await findByTestId(CancelLimitOrderModalSelectorsIDs.CLOSE_BUTTON),
      );
    });

    expect(
      queryByTestId(CancelLimitOrderModalSelectorsIDs.SHEET),
    ).not.toBeOnTheScreen();
    expect(await findByTestId(SHEET)).toBeOnTheScreen();
  });
});
