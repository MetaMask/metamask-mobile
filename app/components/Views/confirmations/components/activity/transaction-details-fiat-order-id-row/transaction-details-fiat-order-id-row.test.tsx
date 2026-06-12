import React from 'react';
import { type Hex } from '@metamask/utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { TransactionDetailsFiatOrderIdRow } from './transaction-details-fiat-order-id-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';

jest.mock('../../../hooks/activity/useTransactionDetails');

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
    expect(getByText('order-123')).toBeDefined();
  });

  it('renders the full order ID when it has no slashes', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: createTransactionMeta({
        metamaskPay: { fiat: { orderId: 'simple-order-id' } },
      } as Partial<TransactionMeta>),
    });

    const { getByText } = render();
    expect(getByText('simple-order-id')).toBeDefined();
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
