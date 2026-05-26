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
  strings: (key: string) => key,
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

    it('returns plus for mUSD ERC-20 transfer types (deposits into Money)', () => {
      expect(
        getMoneyAmountPrefixForTransactionMeta(
          makeTx(TransactionType.tokenMethodTransfer),
        ),
      ).toBe('+');
      expect(
        getMoneyAmountPrefixForTransactionMeta(
          makeTx(TransactionType.tokenMethodTransferFrom),
        ),
      ).toBe('+');
    });

    it('returns minus for a batch tx with an outgoing nested type', () => {
      expect(
        getMoneyAmountPrefixForTransactionMeta(
          makeTx(TransactionType.batch, {
            nestedTransactions: [
              { type: TransactionType.moneyAccountWithdraw } as TransactionMeta,
            ],
          }),
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

    it('returns empty string when transferInformation has no symbol', () => {
      expect(
        getMusdDisplayAmountFromTransactionMeta(
          makeTx(TransactionType.incoming, {
            transferInformation: {
              amount: '1000000',
              symbol: '',
              decimals: 6,
              contractAddress: MUSD_TOKEN_ADDRESS,
            } as unknown as NonNullable<TransactionMeta['transferInformation']>,
          }),
        ),
      ).toBe('');
    });

    it('returns a formatted positive amount for incoming deposits', () => {
      const line = getMusdDisplayAmountFromTransactionMeta(
        makeTx(TransactionType.incoming),
      );
      expect(line.startsWith('+')).toBe(true);
      expect(line).toContain('mUSD');
    });

    it('falls back to calldata-decoded amount for locally-signed mUSD tokenMethodTransfer', () => {
      // 1,000.000000 mUSD = 1_000_000_000 in 6-decimal minimal units
      const amountHex = 1_000_000_000n.toString(16).padStart(64, '0');
      const recipientHex =
        '000000000000000000000000bf4bc559f929ce3994ba12d71d564737357bc8c2';
      const data = `0xa9059cbb${recipientHex}${amountHex}`;

      const tx = makeTx(TransactionType.tokenMethodTransfer, {
        transferInformation: undefined,
        txParams: { to: MUSD_TOKEN_ADDRESS, data } as never,
      });

      const line = getMusdDisplayAmountFromTransactionMeta(tx);
      expect(line.startsWith('+')).toBe(true);
      expect(line).toContain('mUSD');
      expect(line).toContain('1,000');
    });

    it('returns empty for non-mUSD tokenMethodTransfer with no transferInformation', () => {
      const tx = makeTx(TransactionType.tokenMethodTransfer, {
        transferInformation: undefined,
        txParams: {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          data: '0xa9059cbb',
        } as never,
      });
      expect(getMusdDisplayAmountFromTransactionMeta(tx)).toBe('');
    });

    it('returns empty when mUSD tokenMethodTransfer calldata has a recipient but no amount', () => {
      // selector + valid recipient slot, but no amount slot — `decodeTransferData`
      // returns "NaN" for the amount instead of throwing.
      const recipientHex =
        '000000000000000000000000bf4bc559f929ce3994ba12d71d564737357bc8c2';
      const tx = makeTx(TransactionType.tokenMethodTransfer, {
        transferInformation: undefined,
        txParams: {
          to: MUSD_TOKEN_ADDRESS,
          data: `0xa9059cbb${recipientHex}`,
        } as never,
      });
      expect(getMusdDisplayAmountFromTransactionMeta(tx)).toBe('');
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

    it('matches incoming and moneyAccountDeposit types', () => {
      expect(
        isIncomingMoneyTransactionMeta(makeTx(TransactionType.incoming)),
      ).toBe(true);
      expect(
        isIncomingMoneyTransactionMeta(
          makeTx(TransactionType.moneyAccountDeposit),
        ),
      ).toBe(true);
    });

    it('returns false for musdConversion (no longer classified as incoming)', () => {
      expect(
        isIncomingMoneyTransactionMeta(makeTx(TransactionType.musdConversion)),
      ).toBe(false);
    });

    it('returns true for a batch tx with a nested moneyAccountDeposit', () => {
      expect(
        isIncomingMoneyTransactionMeta(
          makeTx(TransactionType.batch, {
            nestedTransactions: [
              { type: TransactionType.moneyAccountDeposit } as TransactionMeta,
            ],
          }),
        ),
      ).toBe(true);
    });

    it('returns false for a batch tx with no deposit nested type', () => {
      expect(
        isIncomingMoneyTransactionMeta(
          makeTx(TransactionType.batch, {
            nestedTransactions: [
              { type: TransactionType.simpleSend } as TransactionMeta,
            ],
          }),
        ),
      ).toBe(false);
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
