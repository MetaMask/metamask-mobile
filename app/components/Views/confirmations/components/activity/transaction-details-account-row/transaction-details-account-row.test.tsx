import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { TransactionDetailsAccountRow } from './transaction-details-account-row';
import { useAccountNames } from '../../../../../hooks/DisplayName/useAccountNames';
import { Hex } from '@metamask/utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';

jest.mock('../../../../../hooks/DisplayName/useAccountNames');
jest.mock('../../../hooks/activity/useTransactionDetails');

const ACCOUNT_NAME_MOCK = 'Test Account 1';
const ADDRESS_MOCK = '0x123' as Hex;

const TRANSACTION_META_MOCK = {
  chainId: '0x123' as Hex,
  txParams: {
    from: ADDRESS_MOCK,
  },
  type: TransactionType.predictWithdraw,
} as TransactionMeta;

function render() {
  return renderWithProvider(<TransactionDetailsAccountRow />, {});
}

describe('TransactionDetailsAccountRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useAccountNamesMock = jest.mocked(useAccountNames);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: TRANSACTION_META_MOCK,
    });

    useAccountNamesMock.mockReturnValue([ACCOUNT_NAME_MOCK]);
  });

  it('renders account name', () => {
    const { getByText } = render();
    expect(getByText(ACCOUNT_NAME_MOCK)).toBeDefined();
  });

  it('renders address if no account name', () => {
    // @ts-expect-error - testing undefined return value
    useAccountNamesMock.mockReturnValue([undefined]);

    const { getByText } = render();
    expect(getByText(ADDRESS_MOCK)).toBeDefined();
  });

  it('renders nothing if transaction type is not in the list', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.simpleSend,
      },
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });
});
