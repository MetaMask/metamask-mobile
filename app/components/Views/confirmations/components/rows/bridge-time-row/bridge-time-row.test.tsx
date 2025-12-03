import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { BridgeTimeRow } from './bridge-time-row';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import {
  TransactionPayQuote,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex, Json } from '@metamask/utils';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/pay/useTransactionPayToken');

function render(options: { type?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    options.type && {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [{ type: options.type }],
          },
        },
      },
    },
  );

  return renderWithProvider(<BridgeTimeRow />, { state });
}

describe('BridgeTimeRow', () => {
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);

  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useIsTransactionPayLoadingMock.mockReturnValue(false);

    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);
  });

  it.each([
    ['less than 30 seconds', 29, '< 1 min'],
    ['exactly 30 seconds', 30, '< 1 min'],
    ['less than 60 seconds', 59, '1 min'],
    ['exactly 60 seconds', 60, '1 min'],
    ['greater than 60 seconds', 61, '2 min'],
    ['greater than 120 seconds', 121, '3 min'],
  ])(
    'renders total estimated time if %s',
    async (_title: string, estimatedDuration: number, expected: string) => {
      useTransactionPayTotalsMock.mockReturnValue({
        estimatedDuration,
      } as TransactionPayTotals);

      const { getByText } = render();

      expect(getByText(expected)).toBeDefined();
    },
  );

  it('renders total estimated time if payment token on same chain', async () => {
    useTransactionPayTotalsMock.mockReturnValue({
      estimatedDuration: 120,
    } as TransactionPayTotals);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { chainId: '0x1' as Hex },
    } as ReturnType<typeof useTransactionPayToken>);

    const { getByText } = render();

    expect(getByText('< 10 sec')).toBeDefined();
  });

  it('renders skeleton if quotes loading', async () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId(`bridge-time-row-skeleton`)).toBeDefined();
  });

  it('does not render skeleton when transaction type is in HIDE_TYPES', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { queryByTestId } = render({ type: TransactionType.musdConversion });

    expect(queryByTestId('bridge-time-row-skeleton')).toBeNull();
  });

  it('does not render when transaction type is in HIDE_TYPES', () => {
    useTransactionPayTotalsMock.mockReturnValue({
      estimatedDuration: 60,
    } as TransactionPayTotals);

    const { queryByText } = render({ type: TransactionType.musdConversion });

    expect(queryByText('1 min')).toBeNull();
  });
});
