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
import { BaseNotificationTestIds } from '../../../../component-library/components-temp/BaseNotification/BaseNotification.testIds';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../TransactionElement/utils', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue([{}, {}]),
}));

const TRANSACTION_ID = 'tx-1';

const transaction: TransactionMeta = {
  id: TRANSACTION_ID,
  chainId: '0xe708',
  networkClientId: 'linea-mainnet',
  hash: '0xabc',
  status: TransactionStatus.confirmed,
  time: 1,
  txParams: { from: '0x1', to: '0x2', nonce: '0x2d1' },
};

const state = {
  engine: {
    backgroundState: {
      ...backgroundState,
      TransactionController: {
        ...backgroundState.TransactionController,
        transactions: [transaction],
      },
    },
  },
};

const renderTransactionNotification = () =>
  renderWithProvider(
    <TransactionNotification
      currentNotification={{
        id: 'notification-1',
        status: 'success',
        transaction: { id: TRANSACTION_ID, nonce: '721' },
      }}
      onClose={jest.fn()}
      onDismissComplete={jest.fn()}
      dismissDuration={5000}
    />,
    { state },
  );

describe('TransactionNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the redesigned activity details for the transaction when pressed', async () => {
    const { findByTestId } = renderTransactionNotification();

    fireEvent.press(await findByTestId(BaseNotificationTestIds.CONTAINER));

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRANSACTIONS_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.ACTIVITY_DETAILS, {
      chainId: 'eip155:59144',
      txIdentifier: TRANSACTION_ID,
    });
  });
});
