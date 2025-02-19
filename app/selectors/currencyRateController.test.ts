import {
  selectConversionRate,
  selectCurrentCurrency,
  selectCurrencyRates,
  selectConversionRateByChainId,
} from './currencyRateController';
import { isTestNet } from '../../app/util/networks';
import { CurrencyRateState } from '@metamask/assets-controllers';

jest.mock('../../app/util/networks', () => ({
  isTestNet: jest.fn(),
}));

describe('CurrencyRateController Selectors', () => {
  const mockCurrencyRateState = {
    currencyRates: {
      ETH: { conversionRate: 3000 },
      BTC: { conversionRate: 60000 },
    },
    currentCurrency: 'USD',
  };

  describe('selectConversionRate', () => {
    const mockChainId = '1';
    const mockTicker = 'ETH';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns undefined if on a testnet and fiat is disabled', () => {
      (isTestNet as jest.Mock).mockReturnValue(true);

      const result = selectConversionRate.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
        mockChainId as `0x${string}`,
        mockTicker,
        false,
      );
      expect(result).toBeUndefined();
    });

    it('returns the conversion rate for a valid ticker', () => {
      (isTestNet as jest.Mock).mockReturnValue(false);

      const result = selectConversionRate.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
        mockChainId as `0x${string}`,
        mockTicker,
        true,
      );
      expect(result).toBe(3000);
    });

    it('returns undefined if no ticker is provided', () => {
      (isTestNet as jest.Mock).mockReturnValue(false);

      const result = selectConversionRate.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
        mockChainId as `0x${string}`,
        '',
        true,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('selectConversionRateByChainId', () => {
    const mockChainId = '1';
    const mockNativeCurrency = 'ETH';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns undefined if on a testnet and fiat is disabled', () => {
      (isTestNet as jest.Mock).mockReturnValue(true);

      const result = selectConversionRateByChainId.resultFunc(
        mockCurrencyRateState.currencyRates as unknown as CurrencyRateState['currencyRates'],
        mockChainId as `0x${string}`,
        false,
        mockNativeCurrency,
      );

      expect(result).toBeUndefined();
    });

    it('returns the conversion rate for the native currency of the chain id', () => {
      (isTestNet as jest.Mock).mockReturnValue(false);

      const result = selectConversionRateByChainId.resultFunc(
        mockCurrencyRateState.currencyRates as unknown as CurrencyRateState['currencyRates'],
        mockChainId as `0x${string}`,
        true,
        mockNativeCurrency,
      );

      expect(result).toBe(3000);
    });
  });

  describe('selectCurrentCurrency', () => {
    it('returns the current currency from the state', () => {
      const result = selectCurrentCurrency.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
      );
      expect(result).toBe('USD');
    });

    it('returns undefined if current currency is not set', () => {
      const result = selectCurrentCurrency.resultFunc(
        {} as unknown as CurrencyRateState,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('selectCurrencyRates', () => {
    it('returns all conversion rates from the state', () => {
      const result = selectCurrencyRates.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
      );
      expect(result).toStrictEqual(mockCurrencyRateState.currencyRates);
    });

    it('returns undefined if conversion rates are not set', () => {
      const result = selectCurrencyRates.resultFunc(
        {} as unknown as CurrencyRateState,
      );
      expect(result).toBeUndefined();
    });
  });
});
