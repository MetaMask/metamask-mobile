import '../../../../tests/component-view/mocks';
/**
 * Component View tests for ActivityList.
 *
 * Mirrors (partial): tests/smoke/wallet/incoming-transactions.spec.ts
 * — outgoing "Sent ETH" via local TransactionController; incoming/API paths skipped.
 */
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { RefreshControl } from 'react-native';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
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
  activityListRowPendingSpinnerTestId,
  activityListRowSubtitleTestId,
} from './ActivityList.testIds';

const transactionControllerWithIncomingSync = Engine.context
  .TransactionController as unknown as {
  updateIncomingTransactions: jest.MockedFunction<() => Promise<void>>;
};

describeForPlatforms('ActivityList', () => {
  it('shows pending and confirmed local rows then opens transaction details from a confirmed row', async () => {
    const pendingRowIndex = 1;
    const confirmedRowIndex = 3;
    const pendingTransaction = buildPendingLocalSendTransaction();
    const state = initialStateActivityWithLocalTransactions([
      buildConfirmedLocalSendTransaction(),
      pendingTransaction,
    ]).build();

    const { findByTestId } = renderActivityListViewWithRoutes({
      state,
      extraRoutes: [{ name: Routes.MODAL.ROOT_MODAL_FLOW }],
    });

    const pendingRow = await findByTestId(
      activityListRowItemTestId(pendingRowIndex),
    );
    const pendingScope = within(pendingRow);

    expect(pendingScope.getByText('Sending ETH')).toBeOnTheScreen();
    expect(
      pendingScope.getByTestId(
        activityListRowPendingSpinnerTestId(pendingTransaction.hash as string),
        { includeHiddenElements: true },
      ),
    ).toBeOnTheScreen();
    expect(
      pendingScope.getByTestId(
        activityListRowSubtitleTestId(pendingTransaction.hash as string),
      ),
    ).toHaveTextContent('To: 0x80181...229cC');

    const confirmedRow = await findByTestId(
      activityListRowItemTestId(confirmedRowIndex),
    );
    const confirmedScope = within(confirmedRow);

    expect(confirmedScope.getByText('Sent ETH')).toBeOnTheScreen();
    expect(confirmedScope.getByText('-1 ETH')).toBeOnTheScreen();

    fireEvent.press(confirmedRow);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MODAL.ROOT_MODAL_FLOW)),
    ).toBeOnTheScreen();
  });

  it('pull to refresh on an empty list syncs incoming transactions through Engine', async () => {
    const updateIncomingSpy = jest
      .spyOn(
        transactionControllerWithIncomingSync,
        'updateIncomingTransactions',
      )
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

  it.skip('displays incoming native transfer from another own account — skipped: incoming txs are loaded from accounts API, not TransactionController local state', () => {
    // Blocked: selectLocalTransactions filters to outgoing (from === active address) only.
    // Mirrors incoming-transactions.spec.ts accounts API + address-book poisoning path.
  });

  it.skip('displays incoming native transfer from accounts API with trusted sender — skipped: requires nock mock for accounts.api.cx.metamask.io and address-book poisoning filter', () => {
    // Blocked: mirrors incoming-transactions.spec.ts accounts API path.
  });

  it.skip('displays nothing if privacyMode is enabled — skipped: requires accounts API mock and PrivacyController state driving empty feed', () => {
    // Blocked: E2E spec is already skipped; privacy + API integration not in CV yet.
  });
});
