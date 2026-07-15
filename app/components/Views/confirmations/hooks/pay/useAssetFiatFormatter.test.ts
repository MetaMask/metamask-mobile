import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

import { useAssetFiatFormatter } from './useAssetFiatFormatter';
import { useTransactionPayCurrency } from './useTransactionPayCurrency';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { getIntlNumberFormatter } from '../../../../../util/intl';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useTransactionPayCurrency', () => ({
  useTransactionPayCurrency: jest.fn(),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
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

function buildState({ preferredCurrency = 'usd' } = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectCurrentCurrency) return preferredCurrency;
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

  describe('fiatCurrency selection', () => {
    it('uses the preferred currency outside pay flow', () => {
      buildState({ preferredCurrency: 'eur' });

      const { result } = renderHook(() => useAssetFiatFormatter());

      expect(result.current.fiatCurrency).toBe('eur');
    });

    it('uses the pay currency when useTransactionPayCurrency returns a value', () => {
      buildState({ preferredCurrency: 'eur' });
      mockUseTransactionPayCurrency.mockReturnValue('USD');

      const { result } = renderHook(() => useAssetFiatFormatter());

      expect(result.current.fiatCurrency).toBe('USD');
    });
  });

  describe('format', () => {
    it('formats a numeric amount using Intl currency', () => {
      buildState({ preferredCurrency: 'eur' });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format('100');

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en-US',
        expect.objectContaining({ style: 'currency', currency: 'eur' }),
      );
      expect(mockFormatter.format).toHaveBeenCalledWith('100');
      expect(output).toBe('formatted:100');
    });

    it('formats with the pay currency when in pay flow', () => {
      buildState({ preferredCurrency: 'eur' });
      mockUseTransactionPayCurrency.mockReturnValue('USD');

      const { result } = renderHook(() => useAssetFiatFormatter());
      result.current.format('110');

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en-US',
        expect.objectContaining({ currency: 'USD' }),
      );
      expect(mockFormatter.format).toHaveBeenCalledWith('110');
    });

    it('uses minimumFractionDigits=0 for integer amounts', () => {
      buildState({ preferredCurrency: 'eur' });

      renderHook(() => useAssetFiatFormatter()).result.current.format('100');

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en-US',
        expect.objectContaining({ minimumFractionDigits: 0 }),
      );
    });

    it('uses minimumFractionDigits=2 for non-integer amounts', () => {
      buildState({ preferredCurrency: 'eur' });

      renderHook(() => useAssetFiatFormatter()).result.current.format('100.5');

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en-US',
        expect.objectContaining({ minimumFractionDigits: 2 }),
      );
    });

    it('returns undefined when input is undefined', () => {
      buildState({ preferredCurrency: 'eur' });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format(undefined);

      expect(output).toBeUndefined();
      expect(mockFormatter.format).not.toHaveBeenCalled();
    });

    it('falls back to `${value} ${currency}` when Intl throws', () => {
      buildState({ preferredCurrency: 'eur' });
      mockGetIntlNumberFormatter.mockImplementation(() => {
        throw new Error('boom');
      });

      const { result } = renderHook(() => useAssetFiatFormatter());
      const output = result.current.format('42');

      expect(output).toBe('42 eur');
    });
  });
});
