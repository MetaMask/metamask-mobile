import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { RefreshControl } from 'react-native';
import Engine from '../../../core/Engine';
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
import {
  activityListRowItemTestId,
  activityListRowStatusTestId,
} from './ActivityList.testIds';

describeForPlatforms('ActivityList', () => {
  it('shows pending and confirmed local rows then opens transaction details from a confirmed row', async () => {
    const state = initialStateActivityWithLocalTransactions([
      buildConfirmedLocalSendTransaction(),
      buildPendingLocalSendTransaction(),
    ]).build();

    const { findByTestId } = renderActivityListViewWithRoutes({
      state,
      extraRoutes: [{ name: Routes.MODAL.ROOT_MODAL_FLOW }],
    });

    const pendingStatus = await findByTestId(activityListRowStatusTestId(0));

    expect(pendingStatus).toHaveTextContent(strings('transaction.submitted'));

    const confirmedRow = await findByTestId(activityListRowItemTestId(1));
    const confirmedScope = within(confirmedRow);

    expect(confirmedScope.getByText('Sent ETH')).toBeOnTheScreen();
    expect(
      confirmedScope.getByTestId(activityListRowStatusTestId(1)),
    ).toHaveTextContent(strings('transaction.confirmed'));
    expect(confirmedScope.getByText('-1 ETH')).toBeOnTheScreen();

    fireEvent.press(confirmedRow);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MODAL.ROOT_MODAL_FLOW)),
    ).toBeOnTheScreen();
  });

  it('pull to refresh on an empty list syncs incoming transactions through Engine', async () => {
    const updateIncomingSpy = jest
      .spyOn(Engine.context.TransactionController, 'updateIncomingTransactions')
      .mockResolvedValue(undefined);

    const { UNSAFE_getByType } = renderActivityListView({
      overrides: {
        settings: {
          basicFunctionalityEnabled: true,
        },
      },
    });

    fireEvent(UNSAFE_getByType(RefreshControl), 'refresh');

    await waitFor(() => {
      expect(updateIncomingSpy).toHaveBeenCalledTimes(1);
    });

    updateIncomingSpy.mockRestore();
  });
});
