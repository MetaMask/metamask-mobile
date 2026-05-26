import React from 'react';
import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { otherControllersMock } from '../../../../Views/confirmations/__mocks__/controllers/other-controllers-mock';
import MoneyTransactionDetailsSheet from './MoneyTransactionDetailsSheet';

jest.mock('../../../../Views/confirmations/hooks/activity/useTransactionDetails');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), setOptions: jest.fn() }),
}));

jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details/transaction-details',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetails: () =>
        ReactActual.createElement(
          Text,
          { testID: 'shared-transaction-details' },
          'shared',
        ),
    };
  },
);
jest.mock('./MoneyReceivedDetails', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MoneyReceivedDetails: () =>
      ReactActual.createElement(
        Text,
        { testID: 'money-received-details' },
        'received',
      ),
  };
});

const CHAIN_ID_MOCK = '0x8f';

function render(type: TransactionType) {
  jest.mocked(useTransactionDetails).mockReturnValue({
    transactionMeta: {
      id: 'tx-1',
      chainId: CHAIN_ID_MOCK,
      type,
    } as unknown as TransactionMeta,
  });
  return renderWithProvider(<MoneyTransactionDetailsSheet />, {
    state: merge({}, otherControllersMock),
  });
}

describe('MoneyTransactionDetailsSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    TransactionType.incoming,
    TransactionType.tokenMethodTransfer,
    TransactionType.tokenMethodTransferFrom,
  ])('renders MoneyReceivedDetails for %s', (type) => {
    const { getByTestId, queryByTestId } = render(type);
    expect(getByTestId('money-received-details')).toBeTruthy();
    expect(queryByTestId('shared-transaction-details')).toBeNull();
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.moneyAccountWithdraw,
    TransactionType.musdConversion,
  ])('renders shared TransactionDetails for %s', (type) => {
    const { getByTestId, queryByTestId } = render(type);
    expect(getByTestId('shared-transaction-details')).toBeTruthy();
    expect(queryByTestId('money-received-details')).toBeNull();
  });
});
