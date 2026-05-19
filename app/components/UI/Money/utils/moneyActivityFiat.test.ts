import {
  CHAIN_IDS,
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { safeToChecksumAddress } from '../../../../util/address';
import { buildMoneyActivityFiatLine } from './moneyActivityFiat';
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
  describe('buildMoneyActivityFiatLine', () => {
    it('prefixes mUSD deposits with + and formats fiat in USD via the peg', () => {
      const tx = makeIncomingTx('1000000000');

      const line = buildMoneyActivityFiatLine(
        tx,
        mockRates,
        'usd',
        mockMarketUsd,
      );

      expect(line).toMatch(/^\+.*1,000\.00/);
    });

    it('prefixes outgoing transactions with -', () => {
      const tx = makeIncomingTx('1000000000', {
        type: TransactionType.simpleSend,
      });

      const line = buildMoneyActivityFiatLine(
        tx,
        mockRates,
        'usd',
        mockMarketUsd,
      );

      expect(line).toMatch(/^-/);
    });

    it('converts mUSD to EUR via the peg (ignoring market data)', () => {
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

    it('converts mUSD to fiat via peg-derived token→ETH price when market data is missing', () => {
      const tx = makeIncomingTx('1000000000');

      const line = buildMoneyActivityFiatLine(tx, mockRates, 'usd', {});

      expect(line).toMatch(/^\+.*1,000\.00/);
    });

    it('converts mUSD to EUR via peg when market data is missing', () => {
      const tx = makeIncomingTx('1000000000');

      const line = buildMoneyActivityFiatLine(tx, mockRatesEur, 'eur', {});

      expect(line).toMatch(/^\+/);
      expect(line).toMatch(/920/);
    });

    it('returns empty string when market data is missing and token is not mUSD-like', () => {
      const tx = makeIncomingTx('1000000000', {
        transferInformation: {
          amount: '1000000000',
          decimals: 6,
          symbol: 'OTHER',
          contractAddress: OTHER_TOKEN_CONTRACT,
        },
      });

      const line = buildMoneyActivityFiatLine(tx, mockRates, 'usd', {});

      expect(line).toBe('');
    });

    it('returns empty string when transferInformation is absent', () => {
      const tx = makeIncomingTx('1000000000', {
        transferInformation: undefined,
      });

      const line = buildMoneyActivityFiatLine(
        tx,
        mockRates,
        'usd',
        mockMarketUsd,
      );

      expect(line).toBe('');
    });

    it('returns empty string when currentCurrency is undefined', () => {
      const tx = makeIncomingTx('1000000000');

      const line = buildMoneyActivityFiatLine(
        tx,
        mockRates,
        undefined,
        mockMarketUsd,
      );

      expect(line).toBe('');
    });

    it('returns empty string when currencyRates are undefined', () => {
      const tx = makeIncomingTx('1000000000');

      const line = buildMoneyActivityFiatLine(tx, undefined, 'usd', {});

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

      const line = buildMoneyActivityFiatLine(
        tx,
        mockRates,
        'usd',
        wrongMarket,
      );

      // Pegged to USD: 0.50 mUSD ≈ $0.50, not the market-data-derived ~$39,977.
      expect(line).toMatch(/^\+.*0\.50/);
      expect(line).not.toMatch(/39,977/);
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

      const line = buildMoneyActivityFiatLine(tx, mockRates, 'usd', {});

      expect(line).toMatch(/^\+.*1,000\.00/);
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
