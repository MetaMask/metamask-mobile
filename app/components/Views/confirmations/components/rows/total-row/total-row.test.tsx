import React from 'react';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { TotalRow } from './total-row';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { ConfirmationMetricsState } from '../../../../../../core/redux/slices/confirmationMetrics';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';

jest.mock('../../../hooks/pay/useTransactionTotalFiat');

const TOTAL_FIAT_MOCK = '$123.456';

function render({ isLoading }: { isLoading?: boolean } = {}) {
  return renderWithProvider(<TotalRow />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      {
        confirmationMetrics: {
          isTransactionBridgeQuotesLoadingById: {
            [transactionIdMock]: isLoading,
          },
        } as unknown as ConfirmationMetricsState,
      },
    ),
  });
}

describe('TotalRow', () => {
  const useTransactionTotalFiatMock = jest.mocked(useTransactionTotalFiat);

  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionTotalFiatMock.mockReturnValue({
      total: '123.456',
      totalFormatted: TOTAL_FIAT_MOCK,
    } as ReturnType<typeof useTransactionTotalFiat>);
  });

  it('renders the total amount', () => {
    const { getByText } = render();
    expect(getByText(TOTAL_FIAT_MOCK)).toBeDefined();
  });

  it('renders skeleton when quotes are loading', () => {
    const { getByTestId } = render({ isLoading: true });
    expect(getByTestId('total-row-skeleton')).toBeDefined();
  });
});
