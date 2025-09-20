import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { TransactionDetailsStatusIcon } from './transaction-details-status-icon';
import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';

jest.mock('../../../hooks/activity/useTransactionDetails');

const ERROR_MESSAGE_MOCK = 'Test Error';

function render(transactionMeta: Partial<TransactionMeta>) {
  return renderWithProvider(
    <TransactionDetailsStatusIcon
      transactionMeta={transactionMeta as TransactionMeta}
    />,
    {
      state: merge({}, otherControllersMock),
    },
  );
}

describe('TransactionDetailsStatusIcon', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders success icon if confirmed', () => {
    const { getByTestId } = render({
      status: TransactionStatus.confirmed,
    });

    expect(getByTestId('status-icon-confirmed')).toBeDefined();
  });

  it.each([
    TransactionStatus.approved,
    TransactionStatus.signed,
    TransactionStatus.unapproved,
  ])('renders spinner if status is %s', (status) => {
    const { getByTestId } = render({
      status,
    });

    expect(getByTestId('status-spinner')).toBeDefined();
  });

  it('renders error message if status is failed', () => {
    const { getByText, getByTestId } = render({
      error: {
        name: 'test',
        message: ERROR_MESSAGE_MOCK,
      },
      status: TransactionStatus.failed,
    });

    fireEvent.press(getByTestId('status-tooltip-open-btn'));

    expect(getByText(ERROR_MESSAGE_MOCK)).toBeDefined();
  });

  it('renders error message from stack if status is failed', () => {
    const { getByText, getByTestId } = render({
      error: {
        name: 'test',
        message: 'test',
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
    });

    fireEvent.press(getByTestId('status-tooltip-open-btn'));

    expect(getByText(ERROR_MESSAGE_MOCK)).toBeDefined();
  });
});
