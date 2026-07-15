import '../../../../tests/component-view/mocks';
/**
 * Component View tests for ActivityList.
 *
 * Mirrors (partial): tests/smoke/wallet/incoming-transactions.spec.ts
 * — local TransactionController outgoing rows; accounts API for incoming/outgoing API paths.
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
  initialStateActivityWithAccountsApi,
  ACTIVITY_CV_ACCOUNT,
} from '../../../../tests/component-view/presets/activity';
import {
  setupAccountsTransactionsApiMock,
  clearAccountsTransactionsApiMocks,
} from '../../../../tests/component-view/api-mocking/accounts-transactions';
import {
  renderActivityListView,
  renderActivityListViewWithRoutes,
} from '../../../../tests/component-view/renderers/activity';
import { getRouteProbeTestId } from '../../../../tests/component-view/render';
import {
  activityListRowItemTestId,
  activityListRowPendingSpinnerTestId,
  activityListRowSubtitleTestId,
  activityListRowTitleTestId,
} from './ActivityList.testIds';

const ACTIVITY_CV_RECIPIENT = '0x80181d3ba89220cdb80234fc7aa19d5cc56229cc';

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
});

describeForPlatforms('ActivityList — accounts API transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    clearAccountsTransactionsApiMocks();
  });

  it('displays incoming native transfer from another account via accounts API', async () => {
    const incomingHash = '0xactivitycvincomingapi';
    setupAccountsTransactionsApiMock([
      {
        hash: incomingHash,
        timestamp: new Date().toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_RECIPIENT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '1230000000000000000',
        valueTransfers: [],
        isError: false,
        transactionCategory: 'STANDARD',
      },
    ]);

    const state = initialStateActivityWithAccountsApi().build();
    const { findByTestId } = renderActivityListView({ state });

    const incomingTitle = await waitFor(
      () => findByTestId(activityListRowTitleTestId(incomingHash)),
      { timeout: 10000 },
    );

    expect(incomingTitle).toHaveTextContent('Received');
    expect(
      await findByTestId(activityListRowSubtitleTestId(incomingHash)),
    ).toHaveTextContent('From: 0x80181...229cC');
  });

  it('displays outgoing native transfer via accounts API', async () => {
    const outgoingHash = '0xactivitycvoutgoingapi';
    setupAccountsTransactionsApiMock([
      {
        hash: outgoingHash,
        timestamp: new Date().toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_RECIPIENT,
        value: '1230000000000000000',
        valueTransfers: [],
        isError: false,
        transactionCategory: 'STANDARD',
      },
    ]);

    const state = initialStateActivityWithAccountsApi().build();
    const { findByTestId } = renderActivityListView({ state });

    const outgoingTitle = await waitFor(
      () => findByTestId(activityListRowTitleTestId(outgoingHash)),
      { timeout: 10000 },
    );

    expect(outgoingTitle).toHaveTextContent('Sent');
    expect(
      await findByTestId(activityListRowSubtitleTestId(outgoingHash)),
    ).toHaveTextContent('To: 0x80181...229cC');
  });
});
