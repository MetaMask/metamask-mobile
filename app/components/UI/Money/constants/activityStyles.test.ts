import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import {
  getMoneyAmountPrefixForTransactionMeta,
  getMusdDisplayAmountFromTransactionMeta,
  isIncomingMoneyTransactionMeta,
} from './activityStyles';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
}));

const MOCK_CHAIN: Hex = '0x1';

function makeTx(
  type: TransactionType,
  overrides?: Partial<TransactionMeta>,
): TransactionMeta {
  return {
    id: 'tx-1',
    chainId: MOCK_CHAIN,
    type,
    transferInformation: {
      amount: '1000000000',
      symbol: 'mUSD',
      decimals: 6,
      contractAddress: MUSD_TOKEN_ADDRESS,
    },
    ...overrides,
  } as unknown as TransactionMeta;
}

describe('activityStyles', () => {
  describe('getMoneyAmountPrefixForTransactionMeta', () => {
    it('returns minus for outgoing Money types', () => {
      expect(
        getMoneyAmountPrefixForTransactionMeta(
          makeTx(TransactionType.moneyAccountWithdraw),
        ),
      ).toBe('-');
      expect(
        getMoneyAmountPrefixForTransactionMeta(
          makeTx(TransactionType.simpleSend),
        ),
      ).toBe('-');
    });

    it('returns plus for other classified types', () => {
      expect(
        getMoneyAmountPrefixForTransactionMeta(
          makeTx(TransactionType.moneyAccountDeposit),
        ),
      ).toBe('+');
    });
  });

  describe('getMusdDisplayAmountFromTransactionMeta', () => {
    it('returns empty when transferInformation is incomplete', () => {
      expect(
        getMusdDisplayAmountFromTransactionMeta(
          makeTx(TransactionType.incoming, { transferInformation: undefined }),
        ),
      ).toBe('');
      expect(
        getMusdDisplayAmountFromTransactionMeta(
          makeTx(TransactionType.incoming, {
            transferInformation: {
              amount: '1',
              symbol: 'mUSD',
              contractAddress: MUSD_TOKEN_ADDRESS,
            } as unknown as NonNullable<TransactionMeta['transferInformation']>,
          }),
        ),
      ).toBe('');
    });

    it('prefixes outgoing amounts with minus', () => {
      const line = getMusdDisplayAmountFromTransactionMeta(
        makeTx(TransactionType.moneyAccountWithdraw),
      );
      expect(line.startsWith('-')).toBe(true);
      expect(line).toContain('mUSD');
    });
  });

  describe('isIncomingMoneyTransactionMeta', () => {
    it('returns false when type is missing', () => {
      expect(
        isIncomingMoneyTransactionMeta(
          makeTx(TransactionType.incoming, { type: undefined }),
        ),
      ).toBe(false);
    });

    it('matches incoming deposit and conversion types', () => {
      expect(
        isIncomingMoneyTransactionMeta(makeTx(TransactionType.incoming)),
      ).toBe(true);
      expect(
        isIncomingMoneyTransactionMeta(
          makeTx(TransactionType.moneyAccountDeposit),
        ),
      ).toBe(true);
      expect(
        isIncomingMoneyTransactionMeta(makeTx(TransactionType.musdConversion)),
      ).toBe(true);
    });

    it('returns false for withdraw', () => {
      expect(
        isIncomingMoneyTransactionMeta(
          makeTx(TransactionType.moneyAccountWithdraw),
        ),
      ).toBe(false);
    });
  });
});
