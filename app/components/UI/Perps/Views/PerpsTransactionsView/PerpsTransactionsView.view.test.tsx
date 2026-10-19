/**
 * Component view tests for PerpsTransactionsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsTransactionsView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsTransactionsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';

describe('PerpsTransactionsView', () => {
  it('renders filter tabs when connected', async () => {
    renderPerpsTransactionsView();

    expect(
      await screen.findByText(strings('perps.transactions.tabs.trades')),
    ).toBeOnTheScreen();
  });

  it('switching tabs shows Orders then Funding then Deposits labels', async () => {
    renderPerpsTransactionsView();

    const tradesTab = await screen.findByText(
      strings('perps.transactions.tabs.trades'),
    );
    expect(tradesTab).toBeOnTheScreen();

    const ordersTab = await screen.findByText(
      strings('perps.transactions.tabs.orders'),
    );
    fireEvent.press(ordersTab);
    expect(
      screen.getByText(strings('perps.transactions.tabs.orders')),
    ).toBeOnTheScreen();

    const fundingTab = await screen.findByText(
      strings('perps.transactions.tabs.funding'),
    );
    fireEvent.press(fundingTab);
    expect(
      screen.getByText(strings('perps.transactions.tabs.funding')),
    ).toBeOnTheScreen();

    const depositsTab = await screen.findByText(
      strings('perps.transactions.tabs.deposits'),
    );
    fireEvent.press(depositsTab);
    expect(
      screen.getByText(strings('perps.transactions.tabs.deposits')),
    ).toBeOnTheScreen();
  });

  it('after switching to Funding tab, can switch back to Trades', async () => {
    renderPerpsTransactionsView();

    const fundingTab = await screen.findByText(
      strings('perps.transactions.tabs.funding'),
    );
    fireEvent.press(fundingTab);
    expect(
      screen.getByText(strings('perps.transactions.tabs.funding')),
    ).toBeOnTheScreen();

    const tradesTab = await screen.findByText(
      strings('perps.transactions.tabs.trades'),
    );
    fireEvent.press(tradesTab);
    expect(
      screen.getByText(strings('perps.transactions.tabs.trades')),
    ).toBeOnTheScreen();
  });

  it('shows the Aggregated checkbox on Trades and hides it on Orders', async () => {
    renderPerpsTransactionsView();

    expect(
      await screen.findByText(strings('perps.transactions.aggregated')),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByText(strings('perps.transactions.tabs.orders')),
    );

    await waitFor(() => {
      expect(
        screen.queryByText(strings('perps.transactions.aggregated')),
      ).toBeNull();
    });
  });
});
