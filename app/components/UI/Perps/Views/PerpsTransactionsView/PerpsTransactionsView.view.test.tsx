/**
 * Component view tests for PerpsTransactionsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsTransactionsView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsTransactionsView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';

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
});
