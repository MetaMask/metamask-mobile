/**
 * Component view tests for PerpsCancelAllOrdersView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Order } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultOrderForViews,
  renderPerpsCancelAllOrdersView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';

const orders: Order[] = [
  defaultOrderForViews,
  {
    ...defaultOrderForViews,
    orderId: 'order_view_2',
    symbol: 'BTC',
    side: 'sell',
    size: '0.2',
    originalSize: '0.2',
    price: '52000',
  },
];

describe('PerpsCancelAllOrdersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirms cancelling every open order from the bulk cancel sheet', async () => {
    const cancelOrders = Engine.context.PerpsController
      .cancelOrders as jest.Mock;

    renderPerpsCancelAllOrdersView({
      streamOverrides: { orders },
    });

    expect(
      await screen.findByText(strings('perps.cancel_all_modal.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.description')),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByText(strings('perps.cancel_all_modal.confirm')),
    );

    await waitFor(() => {
      expect(cancelOrders).toHaveBeenCalledWith({ cancelAll: true });
    });
  });

  it('does not expose the cancel action when there are no open orders', async () => {
    const cancelOrders = Engine.context.PerpsController
      .cancelOrders as jest.Mock;

    renderPerpsCancelAllOrdersView({
      streamOverrides: { orders: [] },
    });

    expect(
      await screen.findByText(strings('perps.order.no_orders')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.cancel_all_modal.confirm')),
    ).not.toBeOnTheScreen();
    expect(cancelOrders).not.toHaveBeenCalled();
  });
});
