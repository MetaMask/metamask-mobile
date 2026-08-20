import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { type Hex } from '@metamask/utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ClipboardManager from '../../../../../../core/ClipboardManager';
import { TransactionDetailsFiatOrderIdRow } from './transaction-details-fiat-order-id-row';
import { TransactionDetailsFiatOrderIdRowTestIds } from './transaction-details-fiat-order-id-row.testIds';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

const CHAIN_ID_MOCK = '0x1' as Hex;

function createTransactionMeta(
  overrides?: Partial<TransactionMeta>,
): TransactionMeta {
  return {
    id: 'test-tx',
    chainId: CHAIN_ID_MOCK,
    type: TransactionType.moneyAccountDeposit,
    txParams: { from: '0xSender' },
    metamaskPay: {
      fiat: { orderId: 'provider/order-123' },
    },
    ...overrides,
  } as TransactionMeta;
}

function render() {
  return renderWithProvider(<TransactionDetailsFiatOrderIdRow />, {});
}

describe('TransactionDetailsFiatOrderIdRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta(),
    });
  });

  it('renders the last segment of a slash-separated order ID', () => {
    const { getByText } = render();
    // 'order-123' is short enough to render in full.
    expect(getByText('order-123')).toBeDefined();
  });

  it('renders a short, no-slash order ID in full', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta({
        metamaskPay: { fiat: { orderId: 'simple-id' } },
      } as Partial<TransactionMeta>),
    });

    const { getByText } = render();
    expect(getByText('simple-id')).toBeDefined();
  });

  it('shortens a long order ID to a start…end form', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta({
        metamaskPay: {
          fiat: {
            orderId:
              '/providers/transak-native/orders/3b7a0de1-4156-4663-aea8-ff7a9bb8e703',
          },
        },
      } as Partial<TransactionMeta>),
    });

    const { getByText, queryByText } = render();
    // Full UUID is never rendered; a truncated start…end form is shown instead.
    expect(queryByText('3b7a0de1-4156-4663-aea8-ff7a9bb8e703')).toBeNull();
    expect(getByText('3b7a0de...8e703')).toBeDefined();
  });

  it('copies the full (untruncated) order ID on press', async () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta({
        metamaskPay: {
          fiat: {
            orderId:
              '/providers/transak-native/orders/3b7a0de1-4156-4663-aea8-ff7a9bb8e703',
          },
        },
      } as Partial<TransactionMeta>),
    });

    const { getByTestId } = render();
    fireEvent.press(getByTestId(TransactionDetailsFiatOrderIdRowTestIds.COPY));

    await waitFor(() =>
      expect(ClipboardManager.setString).toHaveBeenCalledWith(
        '3b7a0de1-4156-4663-aea8-ff7a9bb8e703',
      ),
    );
  });

  it('renders nothing when the order ID path has no trailing segment', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta({
        metamaskPay: {
          fiat: { orderId: '/providers/transak-native/orders/' },
        },
      } as Partial<TransactionMeta>),
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });

  it('renders nothing for non-deposit transaction types', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta({
        type: TransactionType.moneyAccountWithdraw,
      }),
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when order ID is missing', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta({
        metamaskPay: {},
      } as Partial<TransactionMeta>),
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });

  it('renders "Order ID" label', () => {
    const { getByText } = render();
    expect(getByText('Order ID')).toBeDefined();
  });
});
