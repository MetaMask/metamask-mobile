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
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { StatusTypes } from '@metamask/bridge-controller';
import { TransactionDetailsStatus } from './transaction-details-status';
import { strings } from '../../../../../../../locales/i18n';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { ARBITRUM_USDC } from '../../../constants/perps';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../../../../util/bridge/hooks/useBridgeTxHistoryData');
jest.mock('../../../../../../selectors/bridgeStatusController');
jest.mock('../../../hooks/useTokenAmount');

const ERROR_MESSAGE_MOCK = 'Test Error';

function render(
  transactionMeta: Partial<TransactionMeta> = {},
  { isBridgeReceive = false } = {},
) {
  return renderWithProvider(
    <TransactionDetailsStatus
      transactionMeta={transactionMeta as TransactionMeta}
      isBridgeReceive={isBridgeReceive}
    />,
    {
      state: merge({}, otherControllersMock),
    },
  );
}

describe('TransactionDetailsStatus', () => {
  const useBridgeTxHistoryDataMock = jest.mocked(useBridgeTxHistoryData);
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const selectBridgeHistoryForAccountMock = jest.mocked(
    selectBridgeHistoryForAccount,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useBridgeTxHistoryDataMock.mockReturnValue({
      bridgeTxHistoryItem: undefined,
      isBridgeComplete: null,
    });

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {} as TransactionMeta,
    });

    useTokenAmountMock.mockReturnValue({} as ReturnType<typeof useTokenAmount>);
  });

  it('renders success if confirmed', () => {
    const { getByTestId, getByText } = render({
      status: TransactionStatus.confirmed,
    });

    expect(getByTestId('status-icon-confirmed')).toBeDefined();
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

    expect(getByTestId(`status-icon-${status}`)).toBeDefined();
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

  it('renders confirmed status if bridge status is complete', () => {
    useBridgeTxHistoryDataMock.mockReturnValue({
      bridgeTxHistoryItem: {
        status: { status: StatusTypes.COMPLETE },
      },
    } as ReturnType<typeof useBridgeTxHistoryData>);

    const { getByTestId, getByText } = render({}, { isBridgeReceive: true });

    expect(getByTestId('status-icon-confirmed')).toBeDefined();
    expect(getByText(strings('transaction.confirmed'))).toBeDefined();
  });

  it.each([StatusTypes.PENDING, StatusTypes.UNKNOWN])(
    'renders submitted status if bridge status is %s',
    (status) => {
      useBridgeTxHistoryDataMock.mockReturnValue({
        bridgeTxHistoryItem: {
          status: { status },
        },
      } as ReturnType<typeof useBridgeTxHistoryData>);

      const { getByTestId, getByText } = render({}, { isBridgeReceive: true });

      expect(getByTestId(`status-icon-submitted`)).toBeDefined();
      expect(getByText(strings('transaction.pending'))).toBeDefined();
    },
  );

  it('renders failed status if bridge status is failed', () => {
    useBridgeTxHistoryDataMock.mockReturnValue({
      bridgeTxHistoryItem: {
        status: { status: StatusTypes.FAILED },
      },
    } as ReturnType<typeof useBridgeTxHistoryData>);

    const { getByTestId, getByText } = render({}, { isBridgeReceive: true });

    expect(getByTestId('status-icon-failed')).toBeDefined();
    expect(getByText(strings('transaction.failed'))).toBeDefined();
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
