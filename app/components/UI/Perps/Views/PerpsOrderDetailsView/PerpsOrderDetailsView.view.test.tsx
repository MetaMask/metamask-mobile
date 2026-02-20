/**
 * Component view tests for PerpsOrderDetailsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsOrderDetailsView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsOrderDetailsView } from 'tests/component-view/renderers/perpsViewRenderer';

describe('PerpsOrderDetailsView', () => {
  it('renders order details with asset symbol when order is provided', async () => {
    renderPerpsOrderDetailsView();

    expect(
      await screen.findByText('ETH', {}, { timeout: 10000 }),
    ).toBeOnTheScreen();
  });

  it('shows error when order is missing', async () => {
    renderPerpsOrderDetailsView({ initialParams: { order: undefined } });

    expect(
      await screen.findByText(
        strings('perps.errors.order_not_found'),
        {},
        {
          timeout: 10000,
        },
      ),
    ).toBeOnTheScreen();
  }, 15000);
});
