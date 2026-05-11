import React from 'react';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useFiatOrderStatus } from '../../../hooks/activity/useFiatOrderStatus';
import { FiatOrderSummaryLine } from './fiat-order-summary-line';

jest.mock('../../../../../../selectors/bridgeStatusController');
jest.mock('../../../../../../util/bridge/hooks/useBridgeTxHistoryData');
jest.mock('../../../hooks/useTokenAmount');
jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useFiatOrderStatus');

const PARENT_TRANSACTION = {
  id: 'parent-id',
  chainId: '0x1',
  status: TransactionStatus.confirmed,
  time: 1755719285723,
  txParams: { from: '0xabc' },
  metamaskPay: {
    fiatOrderId: '/providers/transak/orders/order-123',
    fiatProvider: 'transak',
  },
} as unknown as TransactionMeta;

function render(parentTransaction = PARENT_TRANSACTION) {
  return renderWithProvider(
    <FiatOrderSummaryLine parentTransaction={parentTransaction} />,
    {
      state: {
        engine: {
          backgroundState: {
            TransactionController: { transactions: [] },
          },
        },
      },
    },
  );
}

describe('FiatOrderSummaryLine', () => {
  const useFiatOrderStatusMock = jest.mocked(useFiatOrderStatus);

  beforeEach(() => {
    jest.resetAllMocks();

    useFiatOrderStatusMock.mockReturnValue({
      severity: 'success',
      statusText: 'Completed',
    });

    jest.mocked(selectBridgeHistoryForAccount).mockReturnValue({});
    jest.mocked(useBridgeTxHistoryData).mockReturnValue({
      bridgeTxHistoryItem: undefined,
      isBridgeComplete: null,
    });
    jest
      .mocked(useTokenAmount)
      .mockReturnValue({} as ReturnType<typeof useTokenAmount>);
    jest.mocked(useTransactionDetails).mockReturnValue({
      transactionMeta: {} as TransactionMeta,
    });
  });

  it('renders fiat purchase title', () => {
    const { getByText } = render();

    expect(
      getByText(strings('transaction_details.summary_title.fiat_purchase')),
    ).toBeDefined();
  });

  it('passes fiat order metadata to useFiatOrderStatus', () => {
    render();

    expect(useFiatOrderStatusMock).toHaveBeenCalledWith(
      '/providers/transak/orders/order-123',
      'transak',
      '0xabc',
      TransactionStatus.confirmed,
    );
  });

  it('renders severity from useFiatOrderStatus', () => {
    useFiatOrderStatusMock.mockReturnValue({
      severity: 'error',
      statusText: 'Failed',
    });

    const { getByTestId } = render();

    expect(getByTestId('status-icon-error')).toBeDefined();
  });

  it('includes status text in subtitle', () => {
    useFiatOrderStatusMock.mockReturnValue({
      severity: 'warning',
      statusText: 'Pending',
    });

    const { getByTestId } = render();

    expect(getByTestId('progress-list-item-subtitle').props.children).toEqual(
      expect.stringContaining('Pending'),
    );
  });
});
