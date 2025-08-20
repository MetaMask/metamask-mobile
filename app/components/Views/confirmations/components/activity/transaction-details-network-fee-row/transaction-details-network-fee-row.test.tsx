import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionDetailsNetworkFeeRow } from './transaction-details-network-fee-row';

jest.mock('../../../hooks/activity/useTransactionDetails');

const NETWORK_FEE_FIAT_MOCK = '$123.45';

function render() {
  return renderWithProvider(<TransactionDetailsNetworkFeeRow />, {});
}

describe('TransactionDetailsNetworkFeeRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          networkFeeFiat: NETWORK_FEE_FIAT_MOCK,
        },
      } as unknown as TransactionMeta,
    });
  });

  it('renders network fee fiat', () => {
    const { getByText } = render();
    expect(getByText(NETWORK_FEE_FIAT_MOCK)).toBeDefined();
  });
});
