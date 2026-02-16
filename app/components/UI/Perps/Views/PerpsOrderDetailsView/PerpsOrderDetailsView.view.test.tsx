/**
 * Component view tests for PerpsOrderDetailsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsOrderDetailsView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsOrderDetailsView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';

describe('PerpsOrderDetailsView', () => {
  it('renders order type label when order is provided', async () => {
    renderPerpsOrderDetailsView();

    expect(
      await screen.findByText(strings('perps.order_details.market_buy')),
    ).toBeOnTheScreen();
  });

  it('shows error when order is missing', async () => {
    renderPerpsOrderDetailsView({ initialParams: {} });

    expect(
      await screen.findByText(strings('perps.errors.order_not_found')),
    ).toBeOnTheScreen();
  });
});
