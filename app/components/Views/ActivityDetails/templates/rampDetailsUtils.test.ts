import type { RampsOrder } from '@metamask/ramps-controller';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import I18n from '../../../../../locales/i18n';
import {
  formatRampActivityFiatAmount,
  formatRampActivityFiatTotal,
  formatShortRampOrderId,
  getFiatOrderProviderOrderLink,
  getFiatOrderStatusDescription,
  getRampsOrderStatusDescription,
  valueOrUnavailable,
} from './rampDetailsUtils';

describe('rampDetailsUtils', () => {
  describe('formatShortRampOrderId', () => {
    it('returns ellipsis for missing ids', () => {
      expect(formatShortRampOrderId(undefined)).toBe('...');
      expect(formatShortRampOrderId('')).toBe('...');
    });

    it('keeps short ids intact', () => {
      expect(formatShortRampOrderId('po-1')).toBe('po-1');
      expect(formatShortRampOrderId('12345678')).toBe('12345678');
    });

    it('truncates long ids to ellipsis plus last six characters', () => {
      expect(
        formatShortRampOrderId('bba639be-5c56-44f0-aa51-4e9a4f0e25e6'),
      ).toBe('...0e25e6');
    });
  });

  describe('getFiatOrderProviderOrderLink', () => {
    it('reads providerOrderLink from order data when present', () => {
      const order = {
        data: { providerOrderLink: 'https://example.com/order' },
      } as FiatOrder;

      expect(getFiatOrderProviderOrderLink(order)).toBe(
        'https://example.com/order',
      );
    });

    it('returns undefined when the link is missing or not a string', () => {
      expect(
        getFiatOrderProviderOrderLink({ data: {} } as FiatOrder),
      ).toBeUndefined();
      expect(
        getFiatOrderProviderOrderLink({
          data: { providerOrderLink: 123 },
        } as unknown as FiatOrder),
      ).toBeUndefined();
    });
  });

  describe('getFiatOrderStatusDescription', () => {
    it('returns non-empty statusDescription from order data', () => {
      const order = {
        data: { statusDescription: 'Order completed' },
      } as FiatOrder;

      expect(getFiatOrderStatusDescription(order)).toBe('Order completed');
    });

    it('returns undefined for empty or missing descriptions', () => {
      expect(
        getFiatOrderStatusDescription({
          data: { statusDescription: '' },
        } as FiatOrder),
      ).toBeUndefined();
      expect(
        getFiatOrderStatusDescription({ data: {} } as FiatOrder),
      ).toBeUndefined();
    });
  });

  describe('getRampsOrderStatusDescription', () => {
    it('returns non-empty statusDescription from RampsOrder', () => {
      expect(
        getRampsOrderStatusDescription({
          statusDescription: 'Payment failed',
        } as RampsOrder),
      ).toBe('Payment failed');
    });

    it('returns undefined when absent or empty', () => {
      expect(getRampsOrderStatusDescription({} as RampsOrder)).toBeUndefined();
      expect(
        getRampsOrderStatusDescription({
          statusDescription: '',
        } as RampsOrder),
      ).toBeUndefined();
    });
  });

  describe('valueOrUnavailable', () => {
    it('returns the value when defined', () => {
      expect(valueOrUnavailable('$1.00')).toBe('$1.00');
    });

    it('falls back to the unavailable string', () => {
      expect(valueOrUnavailable(undefined)).toBe('Not available');
    });
  });

  describe('formatRampActivityFiatAmount', () => {
    const originalLocale = I18n.locale;

    afterEach(() => {
      I18n.locale = originalLocale;
    });

    it.each([
      [100.5, 'USD', '$100.50'],
      ['1234.5', 'USD', '$1,234.50'],
      [2.999, 'USD', '$3.00'],
      [3, 'EUR', '€3.00'],
      [0, 'USD', '$0.00'],
      [0.004, 'USD', '<$0.01'],
    ])('formats %p %s as %s', (amount, currency, expected) => {
      expect(formatRampActivityFiatAmount(amount, currency)).toBe(expected);
    });

    it.each([undefined, ''])('returns undefined for %p', (amount) => {
      expect(formatRampActivityFiatAmount(amount, 'USD')).toBeUndefined();
    });

    it('returns the raw value with the currency when the amount is not a number', () => {
      expect(formatRampActivityFiatAmount('abc', 'USD')).toBe('abc USD');
    });

    it.each([
      ['USDC', '3.00 USDC'],
      ['$', '3.00 $'],
      ['', '3.00'],
      [undefined, '3.00'],
    ])(
      'keeps a non-ISO or missing currency %p visible as %s',
      (currency, expected) => {
        expect(formatRampActivityFiatAmount(3, currency)).toBe(expected);
      },
    );

    it('formats with the app language', () => {
      I18n.locale = 'de';

      expect(formatRampActivityFiatAmount(1234.5, 'EUR')).toBe('1.234,50 €');
    });
  });

  describe('formatRampActivityFiatTotal', () => {
    it('subtracts the fee from the amount', () => {
      expect(formatRampActivityFiatTotal('61.88', '3', 'EUR')).toBe('€58.88');
    });

    it('uses the amount when there is no fee', () => {
      expect(formatRampActivityFiatTotal('6.27', undefined, 'USD')).toBe(
        '$6.27',
      );
    });

    it('returns undefined when the fee is not a number', () => {
      expect(
        formatRampActivityFiatTotal('61.88', 'abc', 'EUR'),
      ).toBeUndefined();
    });

    it('shows zero instead of a negative total when the fee exceeds the amount', () => {
      expect(formatRampActivityFiatTotal(0, 0.004, 'USD')).toBe('$0.00');
    });

    it('returns the raw amount when the amount is not finite', () => {
      expect(formatRampActivityFiatTotal('Infinity', '1', 'USD')).toBe(
        'Infinity USD',
      );
    });
  });
});
