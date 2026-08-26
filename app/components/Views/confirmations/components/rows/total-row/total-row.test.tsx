import React from 'react';
import { TotalRow } from './total-row';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { TransactionPayTotals } from '@metamask/transaction-pay-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/pay/useTransactionPayWithdraw');

const TOTAL_FIAT_MOCK = '$123.46';
const RECEIVE_FIAT_MOCK = '$99.38';

function render(options: { type?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
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

  return renderWithProvider(<TotalRow />, { state });
}

describe('TotalRow', () => {
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useTransactionPayIsMaxAmountMock = jest.mocked(
    useTransactionPayIsMaxAmount,
  );
  const useTransactionPayWithdrawMock = jest.mocked(useTransactionPayWithdraw);

  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionPayTotalsMock.mockReturnValue({
      total: { usd: '123.456' },
      targetAmount: { usd: '99.38', fiat: '99.38' },
    } as unknown as TransactionPayTotals);

    useIsTransactionPayLoadingMock.mockReturnValue(false);

    // Default: deposit/payment flow so the total is shown.
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: false,
      canSelectWithdrawToken: false,
    });
    useTransactionPayIsMaxAmountMock.mockReturnValue(false);
  });

  describe('total cost', () => {
    it('renders the total amount', () => {
      const { getByTestId, getByText } = render();

      expect(getByTestId('total-row')).toBeOnTheScreen();
      expect(getByText(TOTAL_FIAT_MOCK)).toBeDefined();
    });

    it('renders skeleton when quotes are loading', () => {
      useIsTransactionPayLoadingMock.mockReturnValue(true);

      const { getByTestId } = render();

      expect(getByTestId('total-row-skeleton')).toBeDefined();
    });

    it('renders nothing for musd conversion transactions', () => {
      const { queryByTestId, queryByText } = render({
        type: TransactionType.musdConversion,
      });

      expect(queryByTestId('total-row')).toBeNull();
      expect(queryByText(TOTAL_FIAT_MOCK)).toBeNull();
    });

    it('renders the total row when Max is selected on a withdraw flow', () => {
      // Withdraw flows with the feature flag disabled still show the total,
      // even when Max is selected (Max only forces the receive row for
      // non-withdraw flows). isWithdraw is derived from the transaction type.
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: false,
      });
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      const { getByTestId, queryByTestId } = render({
        type: TransactionType.perpsWithdraw,
      });

      expect(getByTestId('total-row')).toBeOnTheScreen();
      expect(queryByTestId('receive-row')).toBeNull();
    });
  });

  describe('receive amount', () => {
    it('renders the receive row for withdraw flows', () => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });

      const { getByTestId, getByText, queryByTestId } = render();

      expect(getByTestId('receive-row')).toBeOnTheScreen();
      expect(getByText(RECEIVE_FIAT_MOCK)).toBeOnTheScreen();
      expect(queryByTestId('total-row')).toBeNull();
    });

    it('renders the receive row for non-withdraw flows when Max is selected', () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      const { getByTestId, getByText, queryByTestId } = render();

      expect(getByTestId('receive-row')).toBeOnTheScreen();
      expect(getByText(RECEIVE_FIAT_MOCK)).toBeOnTheScreen();
      expect(queryByTestId('total-row')).toBeNull();
    });

    it('renders the receive skeleton when quotes are loading', () => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });
      useIsTransactionPayLoadingMock.mockReturnValue(true);

      const { getByTestId } = render();

      expect(getByTestId('receive-row-skeleton')).toBeDefined();
    });

    it('renders the target amount even when it is zero', () => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });
      useTransactionPayTotalsMock.mockReturnValue({
        total: { usd: '123.456' },
        targetAmount: { usd: '0', fiat: '0' },
      } as unknown as TransactionPayTotals);

      const { getByText } = render();

      expect(getByText('$0')).toBeOnTheScreen();
    });
  });
});
