import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  getRequiredBalance,
  getTokenAddress,
  getTokenTransferData,
} from './transaction-pay';
import { PERPS_MINIMUM_DEPOSIT } from '../constants/perps';
import { PREDICT_MINIMUM_DEPOSIT } from '../constants/predict';

const TO_MOCK = '0x0987654321098765432109876543210987654321';
const TOKEN_TRANSFER_DATA_MOCK =
  '0xa9059cbb0000000000000000000000007e5f4552091a69125d5dfcb7b8c2659029395bdf000000000000000000000000000000000000000000000000000000000000012c;';

describe('Transaction Pay Utils', () => {
  describe('getRequiredBalance', () => {
    it('returns value if transaction type is perps deposit', () => {
      const transactionMeta = {
        type: TransactionType.perpsDeposit,
      } as TransactionMeta;

      expect(getRequiredBalance(transactionMeta)).toBe(PERPS_MINIMUM_DEPOSIT);
    });

    it('returns value if transaction type is predict deposit', () => {
      const transactionMeta = {
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      } as TransactionMeta;

      expect(getRequiredBalance(transactionMeta)).toBe(PREDICT_MINIMUM_DEPOSIT);
    });

    it('returns undefined if unsupported transaction type', () => {
      const transactionMeta = {
        type: TransactionType.simpleSend,
      } as TransactionMeta;

      expect(getRequiredBalance(transactionMeta)).toBeUndefined();
    });
  });

  describe('getTokenTransferData', () => {
    it('returns undefined if no token transfer data', () => {
      const transactionMeta = {
        txParams: {
          data: '0x1234',
          to: TO_MOCK,
        },
      } as TransactionMeta;

      expect(getTokenTransferData(transactionMeta)).toBeUndefined();
    });

    it('returns data from single transaction token transfer', () => {
      const transactionMeta = {
        txParams: {
          data: TOKEN_TRANSFER_DATA_MOCK,
          to: TO_MOCK,
        },
      } as TransactionMeta;

      expect(getTokenTransferData(transactionMeta)).toStrictEqual({
        data: TOKEN_TRANSFER_DATA_MOCK,
        to: TO_MOCK,
        index: undefined,
      });
    });

    it('returns data from nested transaction token transfer', () => {
      const transactionMeta = {
        txParams: {
          data: '0x1234',
          to: '0x5678',
        },
        nestedTransactions: [
          {
            data: '0x123456',
            to: '0x567890',
          },
          {
            data: TOKEN_TRANSFER_DATA_MOCK,
            to: TO_MOCK,
          },
        ],
      } as unknown as TransactionMeta;

      expect(getTokenTransferData(transactionMeta)).toStrictEqual({
        data: TOKEN_TRANSFER_DATA_MOCK,
        to: TO_MOCK,
        index: 1,
      });
    });
  });

  describe('getTokenAddress', () => {
    it('returns token address from nested token transfer', () => {
      const transactionMeta = {
        txParams: {
          data: '0x1234',
          to: '0x5678',
        },
        nestedTransactions: [
          {
            data: '0x123456',
            to: '0x567890',
          },
          {
            data: TOKEN_TRANSFER_DATA_MOCK,
            to: TO_MOCK,
          },
        ],
      } as unknown as TransactionMeta;

      expect(getTokenAddress(transactionMeta)).toBe(TO_MOCK);
    });

    it('returns to param if no nested transfer', () => {
      const transactionMeta = {
        txParams: {
          data: TOKEN_TRANSFER_DATA_MOCK,
          to: TO_MOCK,
        },
      } as TransactionMeta;

      expect(getTokenAddress(transactionMeta)).toBe(TO_MOCK);
    });
  });
});
