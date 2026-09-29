import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderOpenLimitOrderDetailsModal } from '../../../../../../tests/component-view/renderers/bridge';
import { MOCK_LIMIT_OPEN_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
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

// Derived from MOCK_LIMIT_OPEN_ORDER: 0.1 ETH at 2200 USDC per ETH, expiring
// on 2026-09-27.
const SUBMITTED_AMOUNT = '0.1 ETH';
const TRIGGER_PRICE = '2200 USDC';
const EXPIRY_DATE = 'Sep 27';

const renderDetails = () =>
  renderOpenLimitOrderDetailsModal({ order: MOCK_LIMIT_OPEN_ORDER });

describeForPlatforms('OpenLimitOrderDetailsModal', () => {
  it('shows every detail of the open order', async () => {
    const { findByTestId, getByTestId, getByText } = renderDetails();

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(
      getByText(strings('bridge.limit.pair', { source: 'ETH', dest: 'USDC' })),
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
    expect(within(submittedRow).getByText(SUBMITTED_AMOUNT)).toBeOnTheScreen();

    const triggerRow = getByTestId(TRIGGER_CONDITION);
    expect(
      within(triggerRow).getByText(strings('bridge.limit.trigger_condition')),
    ).toBeOnTheScreen();
    expect(within(triggerRow).getByText(TRIGGER_PRICE)).toBeOnTheScreen();

    const expiryRow = getByTestId(EXPIRY);
    expect(
      within(expiryRow).getByText(strings('bridge.limit.expiry_label')),
    ).toBeOnTheScreen();
    expect(within(expiryRow).getByText(EXPIRY_DATE)).toBeOnTheScreen();
  });

  // The orders response carries no market price and no trigger side, so the
  // sheet cannot say how far the trigger sits from market yet.
  it('does not compare the trigger price against the market price', async () => {
    const { findByTestId, queryByTestId } = renderDetails();

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(queryByTestId(TRIGGER_COMPARISON)).not.toBeOnTheScreen();
  });

  it('opens the cancel order sheet from the details sheet', async () => {
    const { findByTestId, getByTestId } = renderDetails();

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
    const { findByTestId, queryByTestId } = renderDetails();

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
    const { findByTestId, queryByTestId } = renderDetails();

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
