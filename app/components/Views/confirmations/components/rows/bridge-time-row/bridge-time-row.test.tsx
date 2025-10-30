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
import { QuoteResponse } from '@metamask/bridge-controller';

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

  it.each([
    ['less than 30 seconds', [11, 18], '< 1 min'],
    ['exactly 30 seconds', [12, 18], '< 1 min'],
    ['less than 60 seconds', [35, 10], '1 min'],
    ['exactly 60 seconds', [30, 30], '1 min'],
    ['greater than 60 seconds', [30, 31], '2 min'],
    ['greater than 120 seconds', [60, 61], '3 min'],
  ])(
    'renders total estimated time if %s',
    async (_title: string, durations: number[], expected: string) => {
      const { getByText } = render({
        quotes: durations.map(
          (duration) =>
            ({
              estimatedProcessingTimeInSeconds: duration,
              quote: {
                srcChainId: 1,
                destChainId: 2,
              },
            }) as QuoteResponse,
        ),
      });

      expect(getByText(expected)).toBeDefined();
    },
  );

  it('renders total estimated time if payment token on same chain', async () => {
    const { getByText } = render({
      quotes: [
        {
          estimatedProcessingTimeInSeconds: 120,
          quote: {
            srcChainId: 1,
            destChainId: 1,
          },
        } as QuoteResponse,
      ],
    });

    expect(getByText('2 sec')).toBeDefined();
  });

  it('renders skeleton if quotes loading', async () => {
    useIsTransactionPayLoadingMock.mockReturnValue({ isLoading: true });

    const { getByTestId } = render();

    expect(getByTestId(`bridge-time-row-skeleton`)).toBeDefined();
  });
});
