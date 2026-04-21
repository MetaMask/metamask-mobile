import { TransactionMeta } from '@metamask/transaction-controller';
import {
  getTokenAddress,
  getTokenTransferData,
} from './transaction-pay-token-transfer';

const TOKEN_TRANSFER_DATA =
  '0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000000000000000001';

describe('transaction-pay-token-transfer', () => {
  it('returns token transfer data from txParams when the root transaction is a transfer', () => {
    const transactionMeta = {
      txParams: {
        data: TOKEN_TRANSFER_DATA,
        to: '0x1111111111111111111111111111111111111111',
      },
    } as unknown as TransactionMeta;

    expect(getTokenTransferData(transactionMeta)).toEqual({
      data: TOKEN_TRANSFER_DATA,
      to: '0x1111111111111111111111111111111111111111',
      index: undefined,
    });
    expect(getTokenAddress(transactionMeta)).toBe(
      '0x1111111111111111111111111111111111111111',
    );
  });

  it('returns nested token transfer data when the transfer is inside nested transactions', () => {
    const transactionMeta = {
      txParams: {
        to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
      nestedTransactions: [
        {
          data: '0x1234',
          to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        },
        {
          data: TOKEN_TRANSFER_DATA,
          to: '0x2222222222222222222222222222222222222222',
        },
      ],
    } as unknown as TransactionMeta;

    expect(getTokenTransferData(transactionMeta)).toEqual({
      data: TOKEN_TRANSFER_DATA,
      to: '0x2222222222222222222222222222222222222222',
      index: 1,
    });
    expect(getTokenAddress(transactionMeta)).toBe(
      '0x2222222222222222222222222222222222222222',
    );
  });

  it('falls back to txParams.to when no token transfer data is present', () => {
    const transactionMeta = {
      txParams: {
        data: '0x1234',
        to: '0x3333333333333333333333333333333333333333',
      },
      nestedTransactions: [
        {
          data: '0x4567',
          to: '0x4444444444444444444444444444444444444444',
        },
      ],
    } as unknown as TransactionMeta;

    expect(getTokenTransferData(transactionMeta)).toBeUndefined();
    expect(getTokenAddress(transactionMeta)).toBe(
      '0x3333333333333333333333333333333333333333',
    );
  });
});
