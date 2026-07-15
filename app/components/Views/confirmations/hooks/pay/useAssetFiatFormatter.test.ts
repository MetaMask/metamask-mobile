import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

import { useAssetFiatFormatter } from './useAssetFiatFormatter';
import { useTransactionPayCurrency } from './useTransactionPayCurrency';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { getIntlNumberFormatter } from '../../../../../util/intl';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useTransactionPayCurrency', () => ({
  useTransactionPayCurrency: jest.fn(),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
  selectCurrencyRates: jest.fn(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../../util/intl', () => ({
  getIntlNumberFormatter: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  locale: 'en-US',
  strings: jest.fn((key: string) => key),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseTransactionPayCurrency = jest.mocked(useTransactionPayCurrency);
const mockGetIntlNumberFormatter = jest.mocked(getIntlNumberFormatter);

const mockFormatter = { format: jest.fn() };

function buildState({
  preferredCurrency = 'usd',
  currencyRates = {} as Record<
    string,
    { conversionRate?: number; usdConversionRate?: number }
  >,
  networkConfigs = {} as Record<string, { nativeCurrency: string }>,
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectCurrentCurrency) return preferredCurrency;
    if (selector === selectCurrencyRates) return currencyRates;
    if (selector === selectEvmNetworkConfigurationsByChainId)
      return networkConfigs;
    return undefined;
  });
}

describe('useAssetFiatFormatter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionPayCurrency.mockReturnValue(undefined);
    mockGetIntlNumberFormatter.mockReturnValue(
      mockFormatter as unknown as ReturnType<typeof getIntlNumberFormatter>,
    );
    mockFormatter.format.mockImplementation((n) => `formatted:${String(n)}`);
  });

  describe('outside pay flow', () => {
    it('formats using the preferred currency', () => {
      buildState({ preferredCurrency: 'eur' });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format('100', '0x1');

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en-US',
        expect.objectContaining({ style: 'currency', currency: 'eur' }),
      );
      expect(mockFormatter.format).toHaveBeenCalledWith('100');
      expect(output).toBe('formatted:100');
    });

    it('exposes the fiatCurrency being used', () => {
      buildState({ preferredCurrency: 'eur' });

      const { result } = renderHook(() => useAssetFiatFormatter());
      expect(result.current.fiatCurrency).toBe('eur');
    });

    it('uses minimumFractionDigits=0 for integer amounts', () => {
      buildState({ preferredCurrency: 'eur' });

      renderHook(() => useAssetFiatFormatter()).result.current.format(
        '100',
        '0x1',
      );

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en-US',
        expect.objectContaining({ minimumFractionDigits: 0 }),
      );
    });

    it('uses minimumFractionDigits=2 for non-integer amounts', () => {
      buildState({ preferredCurrency: 'eur' });

      renderHook(() => useAssetFiatFormatter()).result.current.format(
        '100.5',
        '0x1',
      );

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en-US',
        expect.objectContaining({ minimumFractionDigits: 2 }),
      );
    });

    it('treats undefined/null balances as zero', () => {
      buildState({ preferredCurrency: 'eur' });

      renderHook(() => useAssetFiatFormatter()).result.current.format(
        undefined,
        '0x1',
      );

      expect(mockFormatter.format).toHaveBeenCalledWith('0');
    });
  });

  describe('pay flow (USD forced, preferred is EUR)', () => {
    const eurUsdRates = {
      ETH: { conversionRate: 2000, usdConversionRate: 2200 },
    };
    const ethChainConfig = { '0x1': { nativeCurrency: 'ETH' } };

    beforeEach(() => {
      mockUseTransactionPayCurrency.mockReturnValue('USD');
    });

    it('re-scales the amount by usdRate/preferredRate', () => {
      buildState({
        preferredCurrency: 'eur',
        currencyRates: eurUsdRates,
        networkConfigs: ethChainConfig,
      });

      renderHook(() => useAssetFiatFormatter()).result.current.format(
        '100',
        '0x1',
      );

      // 100 EUR * (2200 USD/ETH / 2000 EUR/ETH) = 110 USD
      expect(mockFormatter.format).toHaveBeenCalledWith('110');
      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en-US',
        expect.objectContaining({ currency: 'USD' }),
      );
    });

    it('exposes fiatCurrency as USD', () => {
      buildState({
        preferredCurrency: 'eur',
        currencyRates: eurUsdRates,
        networkConfigs: ethChainConfig,
      });

      const { result } = renderHook(() => useAssetFiatFormatter());
      expect(result.current.fiatCurrency).toBe('USD');
    });

    it('returns undefined when usdConversionRate is missing', () => {
      buildState({
        preferredCurrency: 'eur',
        currencyRates: { ETH: { conversionRate: 2000 } },
        networkConfigs: ethChainConfig,
      });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format('100', '0x1');

      expect(output).toBeUndefined();
      expect(mockFormatter.format).not.toHaveBeenCalled();
    });

    it('returns undefined when preferred conversionRate is missing', () => {
      buildState({
        preferredCurrency: 'eur',
        currencyRates: { ETH: { usdConversionRate: 2200 } },
        networkConfigs: ethChainConfig,
      });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format('100', '0x1');

      expect(output).toBeUndefined();
      expect(mockFormatter.format).not.toHaveBeenCalled();
    });

    it('returns undefined when chain has no EVM network config', () => {
      buildState({
        preferredCurrency: 'eur',
        currencyRates: eurUsdRates,
        networkConfigs: {},
      });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format('100', '0x1');

      expect(output).toBeUndefined();
      expect(mockFormatter.format).not.toHaveBeenCalled();
    });

    it('formats zero even when rates or chain config are missing', () => {
      buildState({
        preferredCurrency: 'eur',
        currencyRates: {},
        networkConfigs: {},
      });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format(0, undefined);

      expect(output).toBe('formatted:0');
      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en-US',
        expect.objectContaining({ currency: 'USD' }),
      );
    });
  });

  describe('pay flow (USD forced, preferred is already USD)', () => {
    it('does not re-scale (identity), so numeric value is unchanged', () => {
      mockUseTransactionPayCurrency.mockReturnValue('USD');
      buildState({
        preferredCurrency: 'usd',
        currencyRates: {
          ETH: { conversionRate: 2200, usdConversionRate: 2200 },
        },
        networkConfigs: { '0x1': { nativeCurrency: 'ETH' } },
      });

      renderHook(() => useAssetFiatFormatter()).result.current.format(
        '100',
        '0x1',
      );

      expect(mockFormatter.format).toHaveBeenCalledWith('100');
    });

    it('still formats when currency rates are missing (no conversion needed)', () => {
      mockUseTransactionPayCurrency.mockReturnValue('USD');
      buildState({
        preferredCurrency: 'usd',
        currencyRates: {},
        networkConfigs: {},
      });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format('100', '0x1');

      expect(output).toBe('formatted:100');
    });
  });

  describe('formatter error fallback', () => {
    it('falls back to `${value} ${currency}` when Intl throws', () => {
      buildState({ preferredCurrency: 'eur' });
      mockGetIntlNumberFormatter.mockImplementation(() => {
        throw new Error('boom');
      });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format('42', '0x1');

      expect(output).toBe('42 eur');
    });
  });
});
