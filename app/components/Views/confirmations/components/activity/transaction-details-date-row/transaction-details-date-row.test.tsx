import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionDetailsDateRow } from './transaction-details-date-row';

jest.mock('../../../hooks/activity/useTransactionDetails');

const TIMESTAMP_MOCK = 1755719285723;

function render() {
  return renderWithProvider(<TransactionDetailsDateRow />, {});
}

describe('TransactionDetailsDateRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        time: TIMESTAMP_MOCK,
      } as unknown as TransactionMeta,
    });
  });

  it('renders time', () => {
    const { getByText } = render();
    expect(getByText('3:48 PM,')).toBeDefined();
  });

  it('renders date', () => {
    const { getByText } = render();
    expect(getByText('Aug 20, 2025')).toBeDefined();
  });
});
