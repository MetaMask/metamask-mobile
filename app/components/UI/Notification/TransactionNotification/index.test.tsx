import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import TransactionNotification from './index';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { selectLocalActivityItemsByIdentifier } from '../../../../selectors/activity';
import { mapTransactionToActivityItem } from '../../Transactions/AssetDetailsActivityListItem.utils';
import { BaseNotificationTestIds } from '../../../../component-library/components-temp/BaseNotification/BaseNotification.testIds';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { getCurrentRoute: jest.fn() } },
}));

jest.mock('../../../../selectors/activity', () => ({
  ...jest.requireActual('../../../../selectors/activity'),
  selectLocalActivityItemsByIdentifier: jest.fn(),
}));

jest.mock('../../TransactionElement/utils', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue([{}, {}]),
}));

const mockGetCurrentRoute = jest.mocked(
  NavigationService.navigation.getCurrentRoute,
);
const mockSelectLocalActivityItemsByIdentifier = jest.mocked(
  selectLocalActivityItemsByIdentifier,
);

const TRANSACTION_ID = 'tx-1';
const TRANSACTION_HASH = '0xabc';

const createTransaction = (
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta => ({
  id: TRANSACTION_ID,
  chainId: '0xe708',
  networkClientId: 'linea-mainnet',
  hash: TRANSACTION_HASH,
  status: TransactionStatus.confirmed,
  time: 1,
  txParams: { from: '0x1', to: '0x2', nonce: '0x2d1' },
  ...overrides,
});

const renderTransactionNotification = (
  transaction: TransactionMeta = createTransaction(),
) => {
  const onDismissComplete = jest.fn();
  const view = renderWithProvider(
    <TransactionNotification
      currentNotification={{
        id: 'notification-1',
        status: 'success',
        transaction: { id: TRANSACTION_ID, nonce: '721' },
      }}
      onClose={jest.fn()}
      onDismissComplete={onDismissComplete}
      dismissDuration={5000}
    />,
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            TransactionController: {
              ...backgroundState.TransactionController,
              transactions: [transaction],
            },
          },
        },
      },
    },
  );
  return { ...view, onDismissComplete };
};

const pressNotification = async (
  findByTestId: ReturnType<typeof renderWithProvider>['findByTestId'],
) => fireEvent.press(await findByTestId(BaseNotificationTestIds.CONTAINER));

describe('TransactionNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentRoute.mockReturnValue(undefined);
    mockSelectLocalActivityItemsByIdentifier.mockReturnValue(
      new Map([
        [
          TRANSACTION_ID,
          mapTransactionToActivityItem({ transaction: createTransaction() }),
        ],
      ]),
    );
  });

  it('opens the redesigned activity details and dismisses the toast when pressed', async () => {
    const { findByTestId, onDismissComplete } = renderTransactionNotification();

    await pressNotification(findByTestId);

    expect(onDismissComplete).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRANSACTIONS_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.ACTIVITY_DETAILS, {
      chainId: 'eip155:59144',
      txIdentifier: TRANSACTION_ID,
    });
  });

  it.each([
    [
      'Activity details by the transaction id',
      Routes.ACTIVITY_DETAILS,
      { chainId: 'eip155:59144', txIdentifier: TRANSACTION_ID },
    ],
    [
      'Activity details by the transaction hash',
      Routes.ACTIVITY_DETAILS,
      { chainId: 'eip155:59144', txIdentifier: TRANSACTION_HASH },
    ],
    [
      'Activity details by the hash in a different case',
      Routes.ACTIVITY_DETAILS,
      { chainId: 'eip155:59144', txIdentifier: '0xABC' },
    ],
    [
      'the confirmations details by the transaction id',
      Routes.TRANSACTION_DETAILS,
      { transactionId: TRANSACTION_ID },
    ],
  ])(
    'does not navigate again when %s is already open',
    async (_label, name, params) => {
      mockGetCurrentRoute.mockReturnValue({ key: 'details', name, params });
      const { findByTestId, onDismissComplete } =
        renderTransactionNotification();

      await pressNotification(findByTestId);

      expect(onDismissComplete).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    },
  );

  it("navigates when another transaction's details are open", async () => {
    mockGetCurrentRoute.mockReturnValue({
      key: 'details',
      name: Routes.ACTIVITY_DETAILS,
      params: { chainId: 'eip155:59144', txIdentifier: '0xdef' },
    });
    const { findByTestId } = renderTransactionNotification();

    await pressNotification(findByTestId);

    expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.ACTIVITY_DETAILS, {
      chainId: 'eip155:59144',
      txIdentifier: TRANSACTION_ID,
    });
  });

  it('falls back to the confirmations details when the redesigned screen cannot resolve the transaction', async () => {
    mockSelectLocalActivityItemsByIdentifier.mockReturnValue(new Map());
    const { findByTestId } = renderTransactionNotification();

    await pressNotification(findByTestId);

    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.TRANSACTION_DETAILS,
      {
        transactionId: TRANSACTION_ID,
      },
    );
  });

  it('falls back to the confirmations details without throwing when the chain id is malformed', async () => {
    const { findByTestId } = renderTransactionNotification(
      createTransaction({ chainId: '0xzz' }),
    );

    await pressNotification(findByTestId);

    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.TRANSACTION_DETAILS,
      {
        transactionId: TRANSACTION_ID,
      },
    );
  });
});
