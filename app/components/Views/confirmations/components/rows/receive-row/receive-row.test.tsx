import React from 'react';
import { ReceiveRow } from './receive-row';
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

const INPUT_AMOUNT_USD_MOCK = '100';
const PROVIDER_FEE_USD_MOCK = '0.50';
const EXPECTED_RECEIVE_MOCK = '$99.50';

function render(inputAmountUsd: string = INPUT_AMOUNT_USD_MOCK) {
  return renderWithProvider(<ReceiveRow inputAmountUsd={inputAmountUsd} />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('ReceiveRow', () => {
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: PROVIDER_FEE_USD_MOCK },
      },
    } as TransactionPayTotals);

    useIsTransactionPayLoadingMock.mockReturnValue(false);
  });

  it('renders the receive amount (input minus provider fee)', () => {
    const { getByText } = render();
    expect(getByText(EXPECTED_RECEIVE_MOCK)).toBeDefined();
  });

  it('renders skeleton when quotes are loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('receive-row-skeleton')).toBeDefined();
  });

  it('renders zero if provider fee exceeds input amount', () => {
    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '200' },
      },
    } as TransactionPayTotals);

    const { getByText } = render('100');
    expect(getByText('$0')).toBeDefined();
  });

  it('renders empty string if totals is undefined', () => {
    useTransactionPayTotalsMock.mockReturnValue(undefined);

    const { queryByText } = render();
    expect(queryByText(EXPECTED_RECEIVE_MOCK)).toBeNull();
  });
});
