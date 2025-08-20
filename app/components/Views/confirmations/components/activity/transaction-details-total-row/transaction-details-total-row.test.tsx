import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionDetailsTotalRow } from './transaction-details-total-row';

jest.mock('../../../hooks/activity/useTransactionDetails');

const TOTAL_FIAT_MOCK = '$123.45';

function render() {
  return renderWithProvider(<TransactionDetailsTotalRow />, {});
}

describe('TransactionDetailsTotalRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          totalFiat: TOTAL_FIAT_MOCK,
        },
      } as unknown as TransactionMeta,
    });
  });

  it('renders total fiat', () => {
    const { getByText } = render();
    expect(getByText(TOTAL_FIAT_MOCK)).toBeDefined();
  });
});
