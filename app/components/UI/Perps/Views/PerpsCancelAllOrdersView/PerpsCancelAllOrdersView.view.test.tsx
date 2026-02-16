/**
 * Component view tests for PerpsCancelAllOrdersView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsCancelAllOrdersView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsCancelAllOrdersView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';

describe('PerpsCancelAllOrdersView', () => {
  it('renders view content when stream provides orders', async () => {
    renderPerpsCancelAllOrdersView({ streamOverrides: { orders: [] } });

    await expect(
      screen.findByText(strings('perps.cancel_all_modal.title')),
    ).resolves.toBeOnTheScreen();
  });

  it('with zero orders: shows title and no-orders empty state', async () => {
    renderPerpsCancelAllOrdersView({ streamOverrides: { orders: [] } });

    expect(
      await screen.findByText(strings('perps.cancel_all_modal.title')),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.order.no_orders')),
    ).toBeOnTheScreen();
  });
});
