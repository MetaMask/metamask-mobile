import '../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  buildConfirmedLocalSendTransaction,
  buildPendingLocalSendTransaction,
  initialStateActivityWithLocalTransactions,
} from '../../../../tests/component-view/presets/activity';
import {
  renderActivityListView,
  renderActivityListViewWithRoutes,
} from '../../../../tests/component-view/renderers/activity';
import { getRouteProbeTestId } from '../../../../tests/component-view/render';
import { ActivityListSelectorsIDs } from './ActivityList.testIds';

describeForPlatforms('ActivityList', () => {
  it('renders confirmed local activity rows with complete row data after load', async () => {
    const state = initialStateActivityWithLocalTransactions([
      buildConfirmedLocalSendTransaction(),
    ]).build();

    const { findByTestId } = renderActivityListView({ state });

    const row = await findByTestId('transaction-item-0');
    const rowScope = within(row);

    expect(
      await findByTestId(ActivityListSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(rowScope.getByText('Sent ETH')).toBeOnTheScreen();
    expect(rowScope.getByTestId('transaction-status-0')).toHaveTextContent(
      strings('transaction.confirmed'),
    );
    expect(rowScope.getByText('-1 ETH')).toBeOnTheScreen();
  });

  it('renders pending local transactions with submitted status label', async () => {
    const state = initialStateActivityWithLocalTransactions([
      buildPendingLocalSendTransaction(),
    ]).build();

    const { findByTestId } = renderActivityListView({ state });

    const status = await findByTestId('transaction-status-0');

    expect(status).toHaveTextContent(strings('transaction.submitted'));
  });

  it('shows the legacy empty state when no transactions are available', async () => {
    const { findByText } = renderActivityListView();

    expect(
      await findByText(strings('wallet.no_transactions')),
    ).toBeOnTheScreen();
  });

  it('navigates to transaction details when a confirmed row is pressed', async () => {
    const state = initialStateActivityWithLocalTransactions([
      buildConfirmedLocalSendTransaction(),
    ]).build();

    const { findByTestId } = renderActivityListViewWithRoutes({
      state,
      extraRoutes: [{ name: Routes.MODAL.ROOT_MODAL_FLOW }],
    });

    fireEvent.press(await findByTestId('transaction-item-0'));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MODAL.ROOT_MODAL_FLOW)),
    ).toBeOnTheScreen();
  });
});
