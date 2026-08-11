import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsStatusRow } from './transaction-details-status-row';
import { strings } from '../../../../../../../locales/i18n';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext');

function render() {
  return renderWithProvider(<TransactionDetailsStatusRow />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('TransactionDetailsStatusRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useIsMoneyAccountContextMock = jest.mocked(useIsMoneyAccountContext);

  beforeEach(() => {
    jest.resetAllMocks();
    useIsMoneyAccountContextMock.mockReturnValue(false);
  });

  it.each([
    [TransactionStatus.approved, strings('transaction.pending')],
    [TransactionStatus.confirmed, strings('transaction.confirmed')],
    [TransactionStatus.dropped, strings('transaction.failed')],
    [TransactionStatus.failed, strings('transaction.failed')],
    [TransactionStatus.rejected, strings('transaction.pending')],
    [TransactionStatus.signed, strings('transaction.pending')],
    [TransactionStatus.submitted, strings('transaction.pending')],
    [TransactionStatus.unapproved, strings('transaction.pending')],
  ])('renders correct text if status is %s', (status, expectedText) => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        status,
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText(expectedText)).toBeDefined();
  });

  it('shows the status icon outside money context', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        status: TransactionStatus.confirmed,
        type: TransactionType.moneyAccountDeposit,
      } as unknown as TransactionMeta,
    });

    const { getByTestId } = render();

    expect(getByTestId('status-icon-success')).toBeDefined();
  });

  it('renders status text without icon in money context', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        status: TransactionStatus.confirmed,
        type: TransactionType.moneyAccountDeposit,
      } as unknown as TransactionMeta,
    });

    const { getByText, queryByTestId } = render();

    expect(getByText(strings('transaction.confirmed'))).toBeDefined();
    expect(queryByTestId('status-icon-success')).toBeNull();
  });
});
