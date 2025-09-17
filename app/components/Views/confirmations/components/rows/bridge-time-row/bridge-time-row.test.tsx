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

function render({
  quotes = [],
  isLoading = false,
}: {
  quotes?: Partial<TransactionBridgeQuote>[];
  isLoading?: boolean;
} = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    {
      confirmationMetrics: {
        isTransactionBridgeQuotesLoadingById: {
          [transactionIdMock]: isLoading,
        },
        transactionBridgeQuotesById: {
          [transactionIdMock]: quotes,
        },
      } as unknown as ConfirmationMetricsState,
    },
  );

  return renderWithProvider(<BridgeTimeRow />, { state });
}

describe('BridgeTimeRow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    // Clean up any running animations to prevent Jest teardown issues
    jest.clearAllTimers();
    jest.useRealTimers();
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
    const { getByTestId } = render({ isLoading: true });
    expect(getByTestId(`bridge-time-row-skeleton`)).toBeDefined();
  });
});
