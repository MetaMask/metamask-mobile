import React from 'react';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { TotalRow } from './total-row';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useIsTransactionPayLoading';

jest.mock('../../../hooks/pay/useTransactionTotalFiat');
jest.mock('../../../hooks/pay/useIsTransactionPayLoading');

const TOTAL_FIAT_MOCK = '$123.456';

function render() {
  return renderWithProvider(<TotalRow />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
    ),
  });
}

describe('TotalRow', () => {
  const useTransactionTotalFiatMock = jest.mocked(useTransactionTotalFiat);
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionTotalFiatMock.mockReturnValue({
      total: '123.456',
      totalFormatted: TOTAL_FIAT_MOCK,
    } as ReturnType<typeof useTransactionTotalFiat>);

    useIsTransactionPayLoadingMock.mockReturnValue({ isLoading: false });
  });

  it('renders the total amount', () => {
    const { getByText } = render();
    expect(getByText(TOTAL_FIAT_MOCK)).toBeDefined();
  });

  it('renders skeleton when quotes are loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue({ isLoading: true });

    const { getByTestId } = render();

    expect(getByTestId('total-row-skeleton')).toBeDefined();
  });
});
