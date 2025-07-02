import React from 'react';

import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import NestedTransactionData from './nested-transaction-data';
import { fireEvent } from '@testing-library/react-native';

jest.mock('../../../../UI/Name', () => ({
  __esModule: true,
  NameType: {
    EthereumAddress: 'EthereumAddress',
  },
  default: jest.fn(() => null),
}));

describe('NestedTransactionData', () => {
  it('display info for all nested transactions', () => {
    const { getByText } = renderWithProvider(
      <NestedTransactionData />,
      { state: getAppStateForConfirmation(upgradeAccountConfirmation) },
      false,
    );
    expect(getByText('Transaction 1')).toBeTruthy();
    expect(getByText('Transaction 2')).toBeTruthy();
  });

  it('display transaction details when transaction row is clicked', () => {
    const { getByText } = renderWithProvider(
      <NestedTransactionData />,
      { state: getAppStateForConfirmation(upgradeAccountConfirmation) },
      false,
    );
    fireEvent.press(getByText('Transaction 1'));
    expect(getByText('Interacting with')).toBeTruthy();
    expect(getByText('< 0.000001 SepoliaETH')).toBeTruthy();
    expect(getByText('Data')).toBeTruthy();
    expect(
      getByText(upgradeAccountConfirmation.nestedTransactions?.[0]?.data ?? ''),
    ).toBeTruthy();
  });
});
