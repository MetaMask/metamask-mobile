import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsHero } from './transaction-details-hero';
import { useTokensWithBalance } from '../../../../../UI/Bridge/hooks/useTokensWithBalance';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../../../UI/Bridge/hooks/useTokensWithBalance');

const TOKEN_ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_MOCK = '0x123';
const DATA_MOCK =
  '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045000000000000000000000000000000000000000000000000000000000001E240';
const DECIMALS_MOCK = 3;

const TRANSACTION_META_MOCK = {
  chainId: CHAIN_ID_MOCK,
  txParams: {
    data: DATA_MOCK,
    to: TOKEN_ADDRESS_MOCK,
  },
  type: TransactionType.perpsDeposit,
} as unknown as TransactionMeta;

function render() {
  return renderWithProvider(<TransactionDetailsHero />, {
    state: merge({}, otherControllersMock),
  });
}

describe('TransactionDetailsHero', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: TRANSACTION_META_MOCK,
    });

    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        decimals: DECIMALS_MOCK,
        symbol: 'TST',
      },
    ]);
  });

  it('renders human amount', () => {
    const { getByText } = render();
    expect(getByText('$123.456')).toBeDefined();
  });

  it('renders nothing if no to', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          to: undefined,
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders nothing if no data', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          data: undefined,
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders nothing if no decimals', () => {
    useTokensWithBalanceMock.mockReturnValue([]);

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders nothing if no amount in data', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          data: '0x123',
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });
});
