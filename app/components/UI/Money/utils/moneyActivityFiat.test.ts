import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  buildMoneyActivityFiatLine,
  convertUsdToSelectedFiat,
  formatMoneyActivityFiatDisplay,
} from './moneyActivityFiat';
import { getMusdDisplayAmountFromTransactionMeta } from '../constants/activityStyles';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';

const MOCK_CHAIN_ID = '0x1' as Hex;
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

/** Token→ETH `price` so 1000 mUSD × 3000 (ETH→USD) × price ≈ $1000 */
const mockMarketUsd = {
  [MOCK_CHAIN_ID]: {
    [checksumMusdToken]: { price: 1 / 3000 },
  },
};

/** Token→ETH `price` so 1000 mUSD × 2300 (ETH→EUR) × 0.0004 = €920 */
const mockMarketEur = {
  [MOCK_CHAIN_ID]: {
    [checksumMusdToken]: { price: 0.0004 },
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
  describe('convertUsdToSelectedFiat', () => {
    it('returns the same amount when USD is selected', () => {
      expect(convertUsdToSelectedFiat(100, mockRates, 'usd')).toBe(100);
      expect(convertUsdToSelectedFiat(100, mockRates, 'USD')).toBe(100);
    });

    it('converts using ETH rate ratio when non-USD is selected', () => {
      const eurRates = {
        ETH: {
          conversionRate: 2300,
          usdConversionRate: 2500,
          conversionDate: null as number | null,
        },
      };
      expect(convertUsdToSelectedFiat(1000, eurRates, 'eur')).toBeCloseTo(
        1000 * (2300 / 2500),
        5,
      );
    });

    it('returns undefined when rates are missing', () => {
      expect(convertUsdToSelectedFiat(100, {}, 'eur')).toBeUndefined();
    });
  });

  describe('formatMoneyActivityFiatDisplay', () => {
    it('uses exactly two fractional digits', () => {
      const out = formatMoneyActivityFiatDisplay(1234.5, 'USD');
      expect(out).toMatch(/1,234\.50/);
    });
  });

  describe('buildMoneyActivityFiatLine', () => {
    it('prefixes with sign and formats fiat in USD using market rate', () => {
      const tx = makeIncomingTx('1000000000');
      expect(
        buildMoneyActivityFiatLine(tx, mockRates, 'usd', mockMarketUsd),
      ).toMatch(/^\+.*1,000\.00/);
    });

    it('converts to EUR using token→ETH price and ETH→fiat rate', () => {
      const tx = makeIncomingTx('1000000000');
      const line = buildMoneyActivityFiatLine(
        tx,
        mockRatesEur,
        'eur',
        mockMarketEur,
      );
      expect(line).toMatch(/^\+/);
      expect(line).toMatch(/920/);
    });

    it('falls back to USD-equivalent conversion for mUSD when market data is missing', () => {
      const tx = makeIncomingTx('1000000000');
      expect(buildMoneyActivityFiatLine(tx, mockRates, 'usd', {})).toMatch(
        /^\+.*1,000\.00/,
      );
    });

    it('returns empty when market data is missing and token is not mUSD-like', () => {
      const tx = makeIncomingTx('1000000000', {
        transferInformation: {
          amount: '1000000000',
          decimals: 6,
          symbol: 'OTHER',
          contractAddress: OTHER_TOKEN_CONTRACT,
        },
      });
      expect(buildMoneyActivityFiatLine(tx, mockRates, 'usd', {})).toBe('');
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
      expect(getMusdDisplayAmountFromTransactionMeta(tx)).toContain('1,000.50');
    });
  });
});
