import '../../../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaMoneyActivityHistory,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import {
  clearAccountsTransactionsApiMocks,
  setupV1AccountTransactionsApiMock,
} from '../../../../../../tests/component-view/api-mocking/accounts-transactions';
import { MoneyActivityItemTestIds } from '../../components/MoneyActivityItem/MoneyActivityItem.testIds';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';

const PENDING_ID = 'vba-usd-pending';
const FAILED_ID = 'vba-usd-failed';
const COMPLETED_HASH = `0x${'ab'.repeat(32)}`;
const PENDING_AMOUNT = '25.00';
const COMPLETED_AMOUNT = '15.000000';

const transfer = (
  id: string,
  status: 'processing' | 'error' | 'confirmed',
  timestamp: string,
  amount: string,
  transactionHash: string | null,
) => ({
  event_id: `${id}-event`,
  transfer_id: id,
  status,
  event_timestamp: timestamp,
  updated_at: timestamp,
  transfer: {
    sender_address: '0x1111111111111111111111111111111111111111',
    recipient_address: VBA_TEST_MONEY_ADDRESS,
    network: 'monad',
    amount,
    asset: 'mUSD',
    transaction_hash: transactionHash,
  },
});

const vbaTransfers = [
  transfer(
    PENDING_ID,
    'processing',
    '2026-10-22T15:00:00.000Z',
    PENDING_AMOUNT,
    null,
  ),
  transfer(FAILED_ID, 'error', '2026-10-21T15:00:00.000Z', '8.00', null),
  transfer(
    'vba-usd-completed',
    'confirmed',
    '2026-10-20T15:00:00.000Z',
    COMPLETED_AMOUNT,
    COMPLETED_HASH,
  ),
];

const activityFlagOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          moneyVbaPendingActivityEnabled: {
            enabled: true,
            minimumVersion: '0.0.0',
          },
          moneyVbaCompletedActivityEnabled: {
            enabled: true,
            minimumVersion: '0.0.0',
          },
          moneyEnableActivityDetails: {
            enabled: true,
            minimumVersion: '0.0.0',
          },
          moneyEnableCardActivityEnrichment: {
            enabled: false,
            minimumVersion: '0.0.0',
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const engineCall = Engine.controllerMessenger.call as jest.Mock;

const installVbaTransfers = (transfers: unknown[]) => {
  const previous = engineCall.getMockImplementation();
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountApiDataService:fetchVbaTransfers') {
      return Promise.resolve({ transfers });
    }
    if (previous) {
      return previous(action, ...args);
    }
    return Promise.resolve(undefined);
  });
  return () => {
    engineCall.mockImplementation(
      previous ?? (() => Promise.resolve(undefined)),
    );
  };
};

const renderActivity = () =>
  renderVbaMoneyActivityHistory({ overrides: activityFlagOverrides });

const rowTestId = (id: string) => `${MoneyActivityItemTestIds.ROW}-${id}`;

describeForPlatforms('Money activity VBA history view', () => {
  let restoreEngine: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    setupV1AccountTransactionsApiMock();
  });

  afterEach(() => {
    restoreEngine?.();
    restoreEngine = undefined;
    restoreVbaReduxServiceStore();
    clearAccountsTransactionsApiMocks();
  });

  it('shows pending, failed, and completed VBA deposits after the transfers load', async () => {
    restoreEngine = installVbaTransfers(vbaTransfers);
    const { findByTestId, getByTestId } = renderActivity();

    const pendingRow = await findByTestId(rowTestId(PENDING_ID));
    const failedRow = getByTestId(rowTestId(FAILED_ID));
    const completedRow = getByTestId(rowTestId(COMPLETED_HASH));

    expect(
      within(pendingRow).getByText(strings('money.transaction.depositing')),
    ).toBeOnTheScreen();
    expect(
      within(pendingRow).getByText(strings('money.transaction.bank_transfer')),
    ).toBeOnTheScreen();
    expect(
      within(pendingRow).getByText(`+${PENDING_AMOUNT} mUSD`),
    ).toBeOnTheScreen();
    expect(
      within(failedRow).getByText(strings('money.transaction.deposit_failed')),
    ).toBeOnTheScreen();
    expect(within(failedRow).queryByText(/\+8\.00 mUSD/)).not.toBeOnTheScreen();
    expect(
      within(completedRow).getByText(strings('money.transaction.deposited')),
    ).toBeOnTheScreen();
    expect(within(completedRow).getByText('+15.00 mUSD')).toBeOnTheScreen();
    expect(
      getByTestId(MoneyActivityViewTestIds.PENDING_HEADER),
    ).toHaveTextContent(strings('money.activity.pending'));
    expect(engineCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:fetchVbaTransfers',
      expect.objectContaining({
        address: VBA_TEST_MONEY_ADDRESS.toLowerCase(),
      }),
    );
  });

  it('keeps VBA deposits on the deposits filter and drops them from sends', async () => {
    restoreEngine = installVbaTransfers(vbaTransfers);
    const { findByTestId, getByTestId, queryByTestId } = renderActivity();

    expect(await findByTestId(rowTestId(PENDING_ID))).toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_TRANSFERS));

    expect(queryByTestId(rowTestId(PENDING_ID))).not.toBeOnTheScreen();
    expect(queryByTestId(rowTestId(FAILED_ID))).not.toBeOnTheScreen();
    expect(queryByTestId(rowTestId(COMPLETED_HASH))).not.toBeOnTheScreen();
    expect(
      getByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
    ).toHaveTextContent(strings('money.activity.empty'));

    fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_DEPOSITS));

    expect(await findByTestId(rowTestId(PENDING_ID))).toBeOnTheScreen();
    expect(getByTestId(rowTestId(FAILED_ID))).toBeOnTheScreen();
    expect(getByTestId(rowTestId(COMPLETED_HASH))).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
    ).not.toBeOnTheScreen();
  });

  it('opens the pending deposit details for the loaded amount', async () => {
    restoreEngine = installVbaTransfers(vbaTransfers);
    const { findByTestId, getAllByText, getByText } = renderActivity();

    fireEvent.press(await findByTestId(rowTestId(PENDING_ID)));

    expect(
      await findByTestId('card-transaction-details-back-button'),
    ).toBeOnTheScreen();
    expect(getByText('$25.00')).toBeOnTheScreen();
    expect(
      getAllByText(strings('money.api_activity_details.pending')).length,
    ).toBeGreaterThan(0);
  });

  it('opens the failed deposit details with a failed bank transfer', async () => {
    restoreEngine = installVbaTransfers(vbaTransfers);
    const { findByTestId, getAllByText, getByText, queryByText } =
      renderActivity();

    fireEvent.press(await findByTestId(rowTestId(FAILED_ID)));

    expect(
      await findByTestId('card-transaction-details-back-button'),
    ).toBeOnTheScreen();
    expect(getByText('US$0.00')).toBeOnTheScreen();
    expect(
      getAllByText(strings('money.transaction.failed')).length,
    ).toBeGreaterThan(0);
    expect(queryByText('$8.00')).not.toBeOnTheScreen();
  });

  it('opens the completed deposit details for the confirmed mUSD amount', async () => {
    restoreEngine = installVbaTransfers(vbaTransfers);
    const { findByTestId, getByText } = renderActivity();

    fireEvent.press(await findByTestId(rowTestId(COMPLETED_HASH)));

    expect(
      await findByTestId('card-transaction-details-back-button'),
    ).toBeOnTheScreen();
    expect(getByText('+US$15.00')).toBeOnTheScreen();
    expect(
      getByText(strings('money.api_activity_details.completed')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.api_activity_details.paid_by_metamask')),
    ).toBeOnTheScreen();
  });

  it('shows an empty activity list when the VBA transfer fetch returns none', async () => {
    restoreEngine = installVbaTransfers([]);
    const { findByTestId, getByTestId, queryByTestId } = renderActivity();

    expect(
      await findByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
    ).toHaveTextContent(strings('money.activity.empty'));
    expect(queryByTestId(rowTestId(PENDING_ID))).not.toBeOnTheScreen();
    expect(queryByTestId(MoneyActivityViewTestIds.LIST)).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneyActivityViewTestIds.FILTER_DEPOSITS));

    expect(
      getByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
    ).toHaveTextContent(strings('money.activity.empty'));
    expect(engineCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:fetchVbaTransfers',
      expect.objectContaining({
        address: VBA_TEST_MONEY_ADDRESS.toLowerCase(),
      }),
    );
  });
});
