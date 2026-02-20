/**
 * Component view tests for PerpsCancelAllOrdersView.
 * Tests empty state and populated state with orders, verifying buttons and descriptions.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsCancelAllOrdersView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  renderPerpsCancelAllOrdersView,
  defaultOrderForViews,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';

const multipleOrders = [
  defaultOrderForViews,
  {
    ...defaultOrderForViews,
    orderId: 'order_view_2',
    symbol: 'BTC',
    side: 'sell' as const,
    price: '45000',
    size: '0.1',
    originalSize: '0.1',
  },
];

describe('PerpsCancelAllOrdersView', () => {
  describe('empty state', () => {
    it('shows title and no-orders message when stream has no orders', async () => {
      renderPerpsCancelAllOrdersView({ streamOverrides: { orders: [] } });

      expect(
        await screen.findByText(strings('perps.cancel_all_modal.title')),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText(strings('perps.order.no_orders')),
      ).toBeOnTheScreen();
    });

    it('does not render action buttons in empty state', async () => {
      renderPerpsCancelAllOrdersView({ streamOverrides: { orders: [] } });

      await screen.findByText(strings('perps.cancel_all_modal.title'));

      expect(
        screen.queryByText(strings('perps.cancel_all_modal.keep_orders')),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText(strings('perps.cancel_all_modal.confirm')),
      ).not.toBeOnTheScreen();
    });
  });

  describe('with orders', () => {
    it('shows title, description, and action buttons when orders exist', async () => {
      renderPerpsCancelAllOrdersView({
        streamOverrides: { orders: multipleOrders },
      });

      expect(
        await screen.findByText(strings('perps.cancel_all_modal.title')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.cancel_all_modal.description')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.cancel_all_modal.keep_orders')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.cancel_all_modal.confirm')),
      ).toBeOnTheScreen();
    });

    it('does not show empty state text when orders are present', async () => {
      renderPerpsCancelAllOrdersView({
        streamOverrides: { orders: [defaultOrderForViews] },
      });

      await screen.findByText(strings('perps.cancel_all_modal.title'));

      expect(
        screen.queryByText(strings('perps.order.no_orders')),
      ).not.toBeOnTheScreen();
    });
  });
});
