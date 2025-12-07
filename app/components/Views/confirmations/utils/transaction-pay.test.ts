import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  getAvailableTokens,
  getRequiredBalance,
  getTokenAddress,
  getTokenTransferData,
} from './transaction-pay';
import { PERPS_MINIMUM_DEPOSIT } from '../constants/perps';
import { PREDICT_MINIMUM_DEPOSIT } from '../constants/predict';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import { AssetType, TokenStandard } from '../types/token';
import {
  TransactionPayRequiredToken,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';

const CHAIN_ID_MOCK = '0x1';
const TO_MOCK = '0x0987654321098765432109876543210987654321';

const TOKEN_TRANSFER_DATA_MOCK =
  '0xa9059cbb0000000000000000000000007e5f4552091a69125d5dfcb7b8c2659029395bdf000000000000000000000000000000000000000000000000000000000000012c;';

const TOKEN_MOCK = {
  accountType: EthAccountType.Eoa,
  address: NATIVE_TOKEN_ADDRESS,
  balance: '1.23',
  balanceInSelectedCurrency: '$1.23',
  chainId: CHAIN_ID_MOCK,
  decimals: 18,
  name: 'Native Token 1',
  standard: TokenStandard.ERC20,
  symbol: 'NTV1',
} as AssetType;

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

  describe('getAvailableTokens', () => {
    it('returns tokens if balance', () => {
      const result = getAvailableTokens({
        tokens: [TOKEN_MOCK] as AssetType[],
      });

      expect(result).toMatchObject([TOKEN_MOCK]);
    });

    it('returns token with zero balance if required token', async () => {
      const tokenWithZeroBalance = {
        ...TOKEN_MOCK,
        balance: '0',
        balanceInSelectedCurrency: '$0.00',
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithZeroBalance] as AssetType[],
        requiredTokens: [
          {
            address: TOKEN_MOCK.address as Hex,
            chainId: TOKEN_MOCK.chainId as Hex,
          } as TransactionPayRequiredToken,
        ],
      });

      expect(result).toMatchObject([tokenWithZeroBalance]);
    });

    it('returns token with zero balance if payment token', async () => {
      const tokenWithZeroBalance = {
        ...TOKEN_MOCK,
        balance: '0',
        balanceInSelectedCurrency: '$0.00',
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithZeroBalance] as AssetType[],
        payToken: {
          address: TOKEN_MOCK.address as Hex,
          chainId: TOKEN_MOCK.chainId as Hex,
        } as TransactionPaymentToken,
      });

      expect(result).toMatchObject([tokenWithZeroBalance]);
    });

    it('does not return token if no balance', async () => {
      const tokenWithZeroBalance = {
        ...TOKEN_MOCK,
        balance: '0',
        balanceInSelectedCurrency: '$0.00',
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithZeroBalance] as AssetType[],
      });

      expect(result).toStrictEqual([]);
    });

    it('does not return token if not ERC-20', async () => {
      const tokenWithWrongStandard = {
        ...TOKEN_MOCK,
        standard: TokenStandard.ERC721,
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithWrongStandard] as AssetType[],
      });

      expect(result).toStrictEqual([]);
    });

    it('does not return token if account type is not EVM', async () => {
      const tokenWithWrongAccountType = {
        ...TOKEN_MOCK,
        accountType: SolAccountType.DataAccount,
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithWrongAccountType] as AssetType[],
      });

      expect(result).toStrictEqual([]);
    });

    it('does not return token if on testnet', async () => {
      const tokenOnTestNet = {
        ...TOKEN_MOCK,
        chainId: CHAIN_IDS.SEPOLIA,
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenOnTestNet] as AssetType[],
      });

      expect(result).toStrictEqual([]);
    });
  });
});
