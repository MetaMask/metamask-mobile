import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionDetailsBridgeFeeRow } from './transaction-details-bridge-fee-row';

jest.mock('../../../hooks/activity/useTransactionDetails');

const BRIDGE_FEE_FIAT_MOCK = '$123.45';

function render() {
  return renderWithProvider(<TransactionDetailsBridgeFeeRow />, {});
}

describe('TransactionDetailsBridgeFeeRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          bridgeFeeFiat: BRIDGE_FEE_FIAT_MOCK,
        },
      } as unknown as TransactionMeta,
    });
  });

  it('renders bridge fee fiat', () => {
    const { getByText } = render();
    expect(getByText(BRIDGE_FEE_FIAT_MOCK)).toBeDefined();
  });

  it('renders nothing if no bridge fee fiat', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {},
      } as unknown as TransactionMeta,
    });

    const { queryByText } = render();

    expect(queryByText(BRIDGE_FEE_FIAT_MOCK)).toBeNull();
  });
});
