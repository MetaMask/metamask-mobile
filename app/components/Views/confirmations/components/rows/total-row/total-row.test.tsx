import React from 'react';
import { TotalRow } from './total-row';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { TransactionPayTotals } from '@metamask/transaction-pay-controller';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';

jest.mock('../../../hooks/pay/useTransactionPayData');

const TOTAL_FIAT_MOCK = '$123.46';

function render() {
  return renderWithProvider(<TotalRow />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('TotalRow', () => {
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionPayTotalsMock.mockReturnValue({
      total: { usd: '123.456' },
    } as TransactionPayTotals);

    useIsTransactionPayLoadingMock.mockReturnValue(false);
  });

  it('renders the total amount', () => {
    const { getByText } = render();
    expect(getByText(TOTAL_FIAT_MOCK)).toBeDefined();
  });

  it('renders skeleton when quotes are loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('total-row-skeleton')).toBeDefined();
  });
});
