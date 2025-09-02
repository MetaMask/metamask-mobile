import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { TransactionDetailsStatusRow } from './transaction-details-status-row';
import { strings } from '../../../../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';

jest.mock('../../../hooks/activity/useTransactionDetails');

const ERROR_MESSAGE_MOCK = 'Test Error';

function render() {
  return renderWithProvider(<TransactionDetailsStatusRow />, {});
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

  it('renders error message if status is failed', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        error: {
          message: ERROR_MESSAGE_MOCK,
        },
        status: TransactionStatus.failed,
      } as unknown as TransactionMeta,
    });

    const { getByText, getByTestId } = render();

    fireEvent.press(getByTestId('status-tooltip-open-btn'));

    expect(getByText(ERROR_MESSAGE_MOCK)).toBeDefined();
  });

  it('renders error message from stack if status is failed', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        error: {
          stack:
            'test' +
            JSON.stringify({
              data: {
                message: ERROR_MESSAGE_MOCK,
              },
            }) +
            'test',
        },
        status: TransactionStatus.failed,
      } as unknown as TransactionMeta,
    });

    const { getByText, getByTestId } = render();

    fireEvent.press(getByTestId('status-tooltip-open-btn'));

    expect(getByText(ERROR_MESSAGE_MOCK)).toBeDefined();
  });
});
