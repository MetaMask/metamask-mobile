import {
  CHAIN_IDS,
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  buildMoneyActivityFiatLine,
  getUsdToFiatConversionRate,
} from './moneyActivityFiat';
import { getMusdDisplayAmountFromTransactionMeta } from '../constants/activityStyles';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';

const MOCK_CHAIN_ID = CHAIN_IDS.MONAD as Hex;
/** Non-mUSD ERC-20 address for tests that need a token without mUSD fallback. */
const OTHER_TOKEN_CONTRACT = '0x00000000000000000000000000000000000000aa';

const mockRates = {
  ETH: {
    conversionRate: 3000,
    usdConversionRate: 3000,
    conversionDate: null as number | null,
  },
};

const mockRatesEur = {
  ETH: {
    conversionRate: 2300,
    usdConversionRate: 2500,
    conversionDate: null as number | null,
  },
};

const checksumMusdToken = safeToChecksumAddress(MUSD_TOKEN_ADDRESS) as string;
const checksumOtherToken = safeToChecksumAddress(
  OTHER_TOKEN_CONTRACT as Hex,
) as string;

/** Token→ETH `price` so 1000 mUSD × 3000 (ETH→USD) × price ≈ $1000 */
const mockMarketUsd = {
  [MOCK_CHAIN_ID]: {
    [checksumMusdToken]: { price: 1 / 3000 },
  },
};

/**
 * Non-mUSD token→ETH `price` chosen so that using `usdConversionRate` (2500)
 * yields $1000 while wrongly using `conversionRate` (2300) would yield €920 —
 * proving the fiat line converts token → USD, never the preferred currency.
 */
const mockMarketOther = {
  [MOCK_CHAIN_ID]: {
    [checksumOtherToken]: { price: 1 / 2500 },
  },
};

function makeIncomingTx(
  amountRaw: string,
  overrides?: Partial<TransactionMeta>,
): TransactionMeta {
  return {
    id: '1',
    chainId: MOCK_CHAIN_ID,
    type: TransactionType.incoming,
    transferInformation: {
      amount: amountRaw,
      decimals: 6,
      symbol: 'mUSD',
      contractAddress: MUSD_TOKEN_ADDRESS,
    },
    ...overrides,
  } as unknown as TransactionMeta;
}

describe('moneyActivityFiat', () => {
  describe('buildMoneyActivityFiatLine', () => {
    it('prefixes mUSD deposits with + and formats fiat in USD via the peg', () => {
      const tx = makeIncomingTx('1000000000');

      const line = buildMoneyActivityFiatLine(tx, mockRates, mockMarketUsd);

      expect(line).toMatch(/^\+\$1,000\.00$/);
    });

    it('prefixes outgoing transactions with -', () => {
      const tx = makeIncomingTx('1000000000', {
        type: TransactionType.simpleSend,
      });

      const line = buildMoneyActivityFiatLine(tx, mockRates, mockMarketUsd);

      expect(line).toMatch(/^-\$/);
    });

    it('always shows USD via the peg, ignoring preferred-currency rates', () => {
      const tx = makeIncomingTx('1000000000');

      // Preferred-currency rates present, but mUSD is USD-pegged 1:1.
      const line = buildMoneyActivityFiatLine(tx, mockRatesEur, mockMarketUsd);

      expect(line).toBe('+$1,000.00');
    });

    it('formats mUSD via the peg when market data is missing', () => {
      const tx = makeIncomingTx('1000000000');

      const line = buildMoneyActivityFiatLine(tx, mockRates, {});

      expect(line).toBe('+$1,000.00');
    });

    it('formats mUSD via the peg even when currencyRates are missing', () => {
      const tx = makeIncomingTx('1000000000');

      // mUSD needs no conversion rate — its dollar value is the token amount.
      const line = buildMoneyActivityFiatLine(tx, undefined, {});

      expect(line).toBe('+$1,000.00');
    });

    it('returns empty string for a non-mUSD token (no money-account transfer resolved)', () => {
      const tx = makeIncomingTx('1000000000', {
        transferInformation: {
          amount: '1000000000',
          decimals: 6,
          symbol: 'OTHER',
          contractAddress: OTHER_TOKEN_CONTRACT,
        },
      });

      const line = buildMoneyActivityFiatLine(tx, mockRates, mockMarketOther);

      expect(line).toBe('');
    });

    it('returns empty string when transferInformation is absent', () => {
      const tx = makeIncomingTx('1000000000', {
        transferInformation: undefined,
      });

      const line = buildMoneyActivityFiatLine(tx, mockRates, mockMarketUsd);

      expect(line).toBe('');
    });

    it('ignores wrong mUSD market data and uses the peg', () => {
      // Reproduces the Monad case: backend reports an absurd
      // tokenToEth price for mUSD. We must not propagate that into fiat.
      const wrongMarket = {
        [MOCK_CHAIN_ID]: {
          [checksumMusdToken]: { price: 37.71 },
        },
      };
      // 0.50 mUSD = 500_000 in 6-decimal minimal units.
      const tx = makeIncomingTx('500000');

      const line = buildMoneyActivityFiatLine(tx, mockRates, wrongMarket);

      // Pegged to USD: 0.50 mUSD ≈ $0.50, not the market-data-derived ~$39,977.
      expect(line).toMatch(/^\+\$0\.50$/);
      expect(line).not.toMatch(/39,977/);
    });

    it('decodes a batch withdrawal fiat amount from the nested mUSD transfer and prefixes with -', () => {
      // 0.10 mUSD = 100_000 in 6-decimal minimal units.
      const amountHex = 100_000n.toString(16).padStart(64, '0');
      const recipientHex =
        '000000000000000000000000bf4bc559f929ce3994ba12d71d564737357bc8c2';
      const tx = {
        id: '1',
        chainId: MOCK_CHAIN_ID,
        type: TransactionType.batch,
        nestedTransactions: [
          { type: TransactionType.moneyAccountWithdraw },
          {
            type: TransactionType.tokenMethodTransfer,
            to: MUSD_TOKEN_ADDRESS,
            data: `0xa9059cbb${recipientHex}${amountHex}`,
          },
        ],
      } as unknown as TransactionMeta;

      const line = buildMoneyActivityFiatLine(tx, mockRates, {});

      expect(line).toMatch(/^-\$0\.10$/);
    });

    it('falls back to calldata-decoded amount for locally-signed mUSD tokenMethodTransfer without transferInformation', () => {
      // 1,000.000000 mUSD = 1_000_000_000 in 6-decimal minimal units.
      const amountHex = 1_000_000_000n.toString(16).padStart(64, '0');
      const recipientHex =
        '000000000000000000000000bf4bc559f929ce3994ba12d71d564737357bc8c2';
      const tx = {
        id: '1',
        chainId: MOCK_CHAIN_ID,
        type: TransactionType.tokenMethodTransfer,
        txParams: {
          to: MUSD_TOKEN_ADDRESS,
          data: `0xa9059cbb${recipientHex}${amountHex}`,
        },
      } as unknown as TransactionMeta;

      const line = buildMoneyActivityFiatLine(tx, mockRates, {});

      expect(line).toBe('+$1,000.00');
    });
  });

  describe('getUsdToFiatConversionRate', () => {
    it('returns 1 when the selected currency is USD (matching ETH rates)', () => {
      expect(getUsdToFiatConversionRate(mockRates)).toBe(1);
    });

    it('returns the USD→preferred rate as (currency per ETH) ÷ (USD per ETH)', () => {
      // 2300 / 2500 = 0.92
      expect(getUsdToFiatConversionRate(mockRatesEur)).toBeCloseTo(0.92);
    });

    it('returns undefined when currencyRates are missing', () => {
      expect(getUsdToFiatConversionRate(undefined)).toBeUndefined();
    });
  });

  describe('token amount from raw minimal units', () => {
    it('formats a whole-number amount with two decimals and thousands separator', () => {
      const tx = makeIncomingTx('1000000000');

      const display = getMusdDisplayAmountFromTransactionMeta(tx);

      expect(display).toContain('1,000.00');
      expect(display).toContain('mUSD');
    });

    it('formats a fractional amount with two decimals', () => {
      const tx = makeIncomingTx('1000500000');

      const display = getMusdDisplayAmountFromTransactionMeta(tx);

      expect(display).toContain('1,000.50');
    });
  });
});
