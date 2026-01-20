import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { NetworkFeeRow } from './network-fee-row';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { TransactionPayTotals } from '@metamask/transaction-pay-controller';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useAlerts } from '../../../context/alert-system-context';
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { mockTheme } from '../../../../../../util/theme';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../context/alert-system-context');
jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: () => ({
    trackInlineAlertClicked: jest.fn(),
    trackAlertActionClicked: jest.fn(),
    trackAlertRendered: jest.fn(),
  }),
}));

function render() {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  return renderWithProvider(<NetworkFeeRow />, { state });
}

describe('NetworkFeeRow', () => {
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useAlertsMock = jest.mocked(useAlerts);

  beforeEach(() => {
    jest.resetAllMocks();

    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        sourceNetwork: { estimate: { usd: '0.20' } },
        targetNetwork: { usd: '0.03' },
      },
    } as TransactionPayTotals);

    useAlertsMock.mockReturnValue({
      fieldAlerts: [],
      showAlertModal: jest.fn(),
      setAlertKey: jest.fn(),
    } as never);
  });

  it('renders skeleton when transaction pay totals are loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('network-fee-row-skeleton')).toBeOnTheScreen();
  });

  it('renders summed network fee total in USD', () => {
    const { getByText, getByTestId } = render();

    expect(getByTestId('network-fee-row')).toBeOnTheScreen();
    expect(getByText('$0.23')).toBeOnTheScreen();
  });

  it('renders network fee value using error color when fee alert exists', () => {
    useAlertsMock.mockReturnValue({
      fieldAlerts: [{ field: RowAlertKey.PayWithFee, key: 'pay-with-fee' }],
      showAlertModal: jest.fn(),
      setAlertKey: jest.fn(),
    } as never);

    const { getByTestId, getByText } = render();

    expect(getByText('$0.23')).toBeOnTheScreen();
    expect(getByTestId(ConfirmationRowComponentIDs.NETWORK_FEE)).toHaveStyle({
      color: mockTheme.colors.error.default,
    });
  });
});
