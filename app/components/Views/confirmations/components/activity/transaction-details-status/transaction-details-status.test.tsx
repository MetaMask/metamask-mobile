import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { TransactionDetailsStatus } from './transaction-details-status';
import { strings } from '../../../../../../../locales/i18n';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { ARBITRUM_USDC } from '../../../constants/perps';
import { StatusTypes } from '@metamask/bridge-controller';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext');
jest.mock('../../../../../../selectors/bridgeStatusController');
jest.mock('../../../hooks/useTokenAmount');

const ERROR_MESSAGE_MOCK = 'Test Error';

function render(
  transactionMeta: Partial<TransactionMeta> = {},
  props: Record<string, unknown> = {},
) {
  return renderWithProvider(
    <TransactionDetailsStatus
      transactionMeta={transactionMeta as TransactionMeta}
      {...props}
    />,
    {
      state: merge({}, otherControllersMock),
    },
  );
}

describe('TransactionDetailsStatus', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useIsMoneyAccountContextMock = jest.mocked(useIsMoneyAccountContext);
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const selectBridgeHistoryForAccountMock = jest.mocked(
    selectBridgeHistoryForAccount,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useIsMoneyAccountContextMock.mockReturnValue(false);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {} as TransactionMeta,
    });

    useTokenAmountMock.mockReturnValue({} as ReturnType<typeof useTokenAmount>);
  });

  it('renders success if confirmed', () => {
    const { getByTestId, getByText } = render({
      status: TransactionStatus.confirmed,
    });

    expect(getByTestId('status-icon-success')).toBeDefined();
    expect(getByText(strings('transaction.confirmed'))).toBeDefined();
  });

  it.each([
    TransactionStatus.approved,
    TransactionStatus.signed,
    TransactionStatus.unapproved,
  ])('renders pending icon if status is %s', (status) => {
    const { getByTestId, getByText } = render({
      status,
    });

    expect(getByTestId('status-icon-warning')).toBeDefined();
    expect(getByText(strings('transaction.pending'))).toBeDefined();
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

    expect(getByText(strings('transaction.failed'))).toBeDefined();
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

    expect(getByText(strings('transaction.failed'))).toBeDefined();
    expect(getByText(ERROR_MESSAGE_MOCK)).toBeDefined();
  });

  it('renders icon alongside status text', () => {
    const { getByTestId, getByText } = render({
      status: TransactionStatus.confirmed,
    });

    expect(getByTestId('status-icon-success')).toBeDefined();
    expect(getByText(strings('transaction.confirmed'))).toBeDefined();
  });

  it('renders status text without icon in money context', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);

    const { queryByTestId, getByText } = render({
      status: TransactionStatus.confirmed,
    });

    expect(queryByTestId('status-icon-success')).toBeNull();
    expect(getByText(strings('transaction.confirmed'))).toBeDefined();
  });

  it('renders failed status text without icon or error tooltip in money context', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);

    const { queryByTestId, getByText } = render({
      error: {
        name: 'test',
        message: ERROR_MESSAGE_MOCK,
      },
      status: TransactionStatus.failed,
    });

    expect(getByText(strings('transaction.failed'))).toBeDefined();
    expect(queryByTestId('status-icon-error')).toBeNull();
    expect(queryByTestId('status-tooltip')).toBeNull();
  });

  it('renders solution text if bridge failed but user has successful perps bridge', () => {
    selectBridgeHistoryForAccountMock.mockReturnValue({
      '1': {
        quote: {
          destAsset: { address: ARBITRUM_USDC.address },
        },
        status: {
          status: StatusTypes.COMPLETE,
        },
      },
    } as never);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        requiredTransactionIds: ['1'],
        type: TransactionType.perpsDeposit,
      } as TransactionMeta,
    });

    useTokenAmountMock.mockReturnValue({
      fiat: '$123.45',
    } as ReturnType<typeof useTokenAmount>);

    const { getByText } = render({
      status: TransactionStatus.failed,
      type: TransactionType.perpsDeposit,
    });

    expect(
      getByText(
        strings('transaction_details.perps_deposit_solution', {
          fiat: '$123.45',
        }),
      ),
    ).toBeDefined();
  });
});
