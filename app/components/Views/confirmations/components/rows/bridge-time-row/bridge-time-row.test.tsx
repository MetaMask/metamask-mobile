import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { BridgeTimeRow } from './bridge-time-row';
import { merge } from 'lodash';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { TransactionBridgeQuote } from '../../../utils/bridge';
import { ConfirmationMetricsState } from '../../../../../../core/redux/slices/confirmationMetrics';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useIsTransactionPayLoading';

jest.mock('../../../hooks/pay/useIsTransactionPayLoading');

function render({
  quotes = [],
}: {
  quotes?: Partial<TransactionBridgeQuote>[];
} = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    {
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          [transactionIdMock]: quotes,
        },
      } as unknown as ConfirmationMetricsState,
    },
  );

  return renderWithProvider(<BridgeTimeRow />, { state });
}

describe('BridgeTimeRow', () => {
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useIsTransactionPayLoadingMock.mockReturnValue({ isLoading: false });
  });

  it('renders total estimated time', async () => {
    const { getByText } = render({
      quotes: [
        {
          estimatedProcessingTimeInSeconds: 11,
        },
        {
          estimatedProcessingTimeInSeconds: 14,
        },
      ],
    });

    expect(getByText(`25 sec`)).toBeDefined();
  });

  it('renders skeleton if quotes loading', async () => {
    useIsTransactionPayLoadingMock.mockReturnValue({ isLoading: true });

    const { getByTestId } = render();

    expect(getByTestId(`bridge-time-row-skeleton`)).toBeDefined();
  });
});
