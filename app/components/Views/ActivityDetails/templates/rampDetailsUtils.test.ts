import type { RampsOrder } from '@metamask/ramps-controller';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import {
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
});
