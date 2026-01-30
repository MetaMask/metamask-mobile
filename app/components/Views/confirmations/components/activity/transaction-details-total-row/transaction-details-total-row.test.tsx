import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsTotalRow } from './transaction-details-total-row';
import { useTokenAmount } from '../../../hooks/useTokenAmount';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/useTokenAmount');

const PAY_TOTAL = '123.45';
const TOKEN_TOTAL = '234.56';

function render() {
  return renderWithProvider(<TransactionDetailsTotalRow />, {});
}

describe('TransactionDetailsTotalRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useTokenAmountMock = jest.mocked(useTokenAmount);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          totalFiat: PAY_TOTAL,
        },
      } as unknown as TransactionMeta,
    });

    useTokenAmountMock.mockReturnValue({
      amountUnformatted: TOKEN_TOTAL,
    } as ReturnType<typeof useTokenAmount>);
  });

  it('renders total from pay metadata', () => {
    const { getByText } = render();
    expect(getByText(`$${PAY_TOTAL}`)).toBeDefined();
  });

  it('renders total from token amount', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {},
        type: TransactionType.predictWithdraw,
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText(`$${TOKEN_TOTAL}`)).toBeDefined();
  });

  it('renders nothing if no total fiat and type not supported', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {},
      } as unknown as TransactionMeta,
    });

    const { toJSON } = render();

    expect(toJSON()).toBeNull();
  });

  it('renders total from token amount for musdClaim', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {},
        type: TransactionType.musdClaim,
      } as unknown as TransactionMeta,
    });

    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '123.45',
    } as ReturnType<typeof useTokenAmount>);

    const { getByText } = render();

    expect(getByText('$123.45')).toBeDefined();
  });
});
