import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
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

  beforeEach(() => {
    jest.resetAllMocks();
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

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.moneyAccountWithdraw,
    TransactionType.musdConversion,
    TransactionType.musdClaim,
    TransactionType.perpsDeposit,
    TransactionType.perpsWithdraw,
    TransactionType.predictDeposit,
    TransactionType.predictWithdraw,
    TransactionType.predictClaim,
  ])('hides status icon for %s', (type) => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        status: TransactionStatus.confirmed,
        type,
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();

    expect(queryByTestId('status-icon-success')).toBeNull();
  });

  it('shows status icon for non-text-only types', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        status: TransactionStatus.confirmed,
        type: TransactionType.simpleSend,
      } as unknown as TransactionMeta,
    });

    const { getByTestId } = render();

    expect(getByTestId('status-icon-success')).toBeDefined();
  });
});
