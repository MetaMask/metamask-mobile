/**
 * Component view tests for PerpsOrderDetailsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultOrderDetailsOrder,
  defaultOrderForViews,
  renderPerpsOrderDetailsView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsOrderDetailsViewSelectorsIDs } from '../../Perps.testIds';

const triggerOrder = {
  ...defaultOrderForViews,
  orderId: 'trigger-order-1',
  orderType: 'stop_market' as const,
  isTrigger: true,
  triggerPrice: '2200',
  triggerDirection: 'below' as const,
  reduceOnly: true,
  status: 'open' as const,
  takeProfitPrice: '2800',
  stopLossPrice: '1900',
};

describe('PerpsOrderDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Engine.context.PerpsController.cancelOrder).mockResolvedValue({
      success: true,
    });
  });

  it('renders all key detail rows and the cancel button for a limit order', async () => {
    renderPerpsOrderDetailsView();

    // Header: asset symbol
    expect(await screen.findByText('ETH')).toBeOnTheScreen();

    // All expected detail row labels in one pass
    expect(
      screen.getByText(strings('perps.order_details.date')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order_details.price')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order_details.size')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order_details.original_size')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order_details.reduce_only')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order_details.fee')),
    ).toBeOnTheScreen();

    // Cancel button is present for a cancelable open order
    expect(
      screen.getByTestId(PerpsOrderDetailsViewSelectorsIDs.CANCEL_BUTTON),
    ).toBeOnTheScreen();
  });

  it('pressing cancel sets the button to loading while cancellation is in progress', async () => {
    // Never-resolving mock holds the component in the isCanceling = true state
    jest
      .mocked(Engine.context.PerpsController.cancelOrder)
      .mockReturnValue(new Promise<never>(() => undefined));

    renderPerpsOrderDetailsView();

    const cancelButton = await screen.findByTestId(
      PerpsOrderDetailsViewSelectorsIDs.CANCEL_BUTTON,
    );
    expect(cancelButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.press(cancelButton);
    });

    // Button becomes loading (isDisabled = true while isCanceling)
    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsOrderDetailsViewSelectorsIDs.CANCEL_BUTTON),
      ).toBeDisabled();
    });

    // ETH header still visible during in-progress cancellation
    expect(screen.getByText('ETH')).toBeOnTheScreen();
  });

  it('pressing cancel calls cancelOrder exactly once with the order ID', async () => {
    const cancelOrder = jest.mocked(Engine.context.PerpsController.cancelOrder);

    renderPerpsOrderDetailsView();

    fireEvent.press(
      await screen.findByTestId(
        PerpsOrderDetailsViewSelectorsIDs.CANCEL_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(cancelOrder).toHaveBeenCalledTimes(1);
      expect(cancelOrder).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: defaultOrderDetailsOrder.orderId }),
      );
    });
  });

  it('trigger order shows trigger condition row, reduce-only Yes, and cancel button', async () => {
    renderPerpsOrderDetailsView({ initialParams: { order: triggerOrder } });

    // Trigger condition label and a price value appear
    expect(
      await screen.findByText(strings('perps.order_details.trigger_condition')),
    ).toBeOnTheScreen();

    // Reduce-only is explicitly Yes for this trigger order
    expect(
      screen.getByText(strings('perps.order_details.reduce_only')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order_details.yes')),
    ).toBeOnTheScreen();

    // Cancel button visible (trigger orders are cancelable)
    expect(
      screen.getByTestId(PerpsOrderDetailsViewSelectorsIDs.CANCEL_BUTTON),
    ).toBeOnTheScreen();
  });

  it('shows error state when no order is provided', async () => {
    renderPerpsOrderDetailsView({ initialParams: { order: undefined } });

    expect(
      await screen.findByText(strings('perps.errors.order_not_found')),
    ).toBeOnTheScreen();
  });
});
