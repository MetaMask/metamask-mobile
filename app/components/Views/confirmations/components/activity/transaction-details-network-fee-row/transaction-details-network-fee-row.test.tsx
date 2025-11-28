import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsNetworkFeeRow } from './transaction-details-network-fee-row';
import { useFeeCalculations } from '../../../hooks/gas/useFeeCalculations';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/gas/useFeeCalculations');

const PAY_FEE_MOCK = '123.45';
const CALCULATED_FEE_MOCK = '234.56';

function render() {
  return renderWithProvider(<TransactionDetailsNetworkFeeRow />, {});
}

describe('TransactionDetailsNetworkFeeRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useFeeCalculationsMock = jest.mocked(useFeeCalculations);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          networkFeeFiat: PAY_FEE_MOCK,
        },
      } as unknown as TransactionMeta,
    });

    useFeeCalculationsMock.mockReturnValue({
      estimatedFeeFiatPrecise: CALCULATED_FEE_MOCK,
    } as unknown as ReturnType<typeof useFeeCalculations>);
  });

  it('renders network fee from pay metadata', () => {
    const { getByText } = render();
    expect(getByText(`$${PAY_FEE_MOCK}`)).toBeDefined();
  });

  it('renders network fee from calculation', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.predictWithdraw,
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();
    expect(getByText(`$${CALCULATED_FEE_MOCK}`)).toBeDefined();
  });

  it('renders nothing if no pay metadata and type not supported', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {},
      } as unknown as TransactionMeta,
    });

    const { toJSON } = render();

    expect(toJSON()).toBeNull();
  });
});
