/**
 * Component view tests for PerpsTransactionsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsTransactionsView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsTransactionsView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';

describe('PerpsTransactionsView', () => {
  it('renders filter tabs when connected', async () => {
    renderPerpsTransactionsView();

    expect(
      await screen.findByText(strings('perps.transactions.tabs.trades')),
    ).toBeOnTheScreen();
  });

  it('renders activity view with filter options', async () => {
    renderPerpsTransactionsView();

    await expect(
      screen.findByText(strings('perps.transactions.tabs.trades')),
    ).resolves.toBeOnTheScreen();
  });
});
