import { BigNumber } from 'bignumber.js';
import I18n from '../../locales/i18n';
import formatFiat from './formatFiat';

jest.mock('../../locales/i18n', () => ({
  __esModule: true,
  default: {
    locale: 'en-US',
  },
}));

describe('formatFiat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    I18n.locale = 'en-US';
  });

  describe('standard formatting', () => {
    it('formats large fiat amounts correctly', () => {
      expect(
        formatFiat(new BigNumber('987543219876543219876.54321'), 'USD'),
      ).toBe('$987,543,219,876,543,219,876.54');
    });

    it('formats whole numbers without decimals', () => {
      expect(formatFiat(new BigNumber(1000), 'USD')).toBe('$1,000');
    });

    it('formats decimal amounts with two decimal places', () => {
      expect(formatFiat(new BigNumber(500.5), 'USD')).toBe('$500.50');
    });

    it('formats zero correctly', () => {
      expect(formatFiat(new BigNumber(0), 'USD')).toBe('$0');
    });
  });

  describe('small amount handling', () => {
    it('displays "<$0.01" for amounts less than 0.01', () => {
      expect(formatFiat(new BigNumber(0.005), 'USD')).toBe('<$0.01');
      expect(formatFiat(new BigNumber(0.0049), 'USD')).toBe('<$0.01');
    });

    it('does not display "<" prefix for exactly 0.01', () => {
      expect(formatFiat(new BigNumber(0.01), 'USD')).toBe('$0.01');
    });

    it('does not display "<" prefix for amounts greater than 0.01', () => {
      expect(formatFiat(new BigNumber(0.02), 'USD')).toBe('$0.02');
    });
  });

  describe('currency handling', () => {
    it('formats EUR correctly', () => {
      I18n.locale = 'fr-FR';

      expect(formatFiat(new BigNumber(1000), 'EUR')).toContain('1');
      expect(formatFiat(new BigNumber(1000), 'EUR')).toContain('000');
    });

    it('formats GBP correctly', () => {
      I18n.locale = 'en-GB';

      expect(formatFiat(new BigNumber(1000), 'GBP')).toBe('£1,000');
      expect(formatFiat(new BigNumber(500.5), 'GBP')).toBe('£500.50');
      expect(formatFiat(new BigNumber(0), 'GBP')).toBe('£0');
    });

    it('gracefully handles unknown currencies by returning amount followed by currency code', () => {
      expect(
        formatFiat(new BigNumber('98754321987654321987654321'), 'storj'),
      ).toBe('98754321987654321987654321 storj');
      expect(formatFiat(new BigNumber(1000), 'storj')).toBe('1000 storj');
      expect(formatFiat(new BigNumber(500.5), 'storj')).toBe('500.5 storj');
      expect(formatFiat(new BigNumber(0), 'storj')).toBe('0 storj');
    });

    it('removes "US$" prefix and replaces with "$"', () => {
      const result = formatFiat(new BigNumber(1000), 'USD');
      expect(result).not.toContain('US$');
      expect(result).toBe('$1,000');
    });
  });

  describe('edge cases', () => {
    it('handles very small non-zero amounts', () => {
      expect(formatFiat(new BigNumber(0.001), 'USD')).toBe('<$0.01');
      expect(formatFiat(new BigNumber(0.00001), 'USD')).toBe('<$0.01');
    });

    it('handles negative amounts', () => {
      expect(formatFiat(new BigNumber(-1000), 'USD')).toBe('-$1,000');
      expect(formatFiat(new BigNumber(-500.5), 'USD')).toBe('-$500.50');
    });

    it('handles amounts with many decimal places', () => {
      expect(formatFiat(new BigNumber(123.456789), 'USD')).toBe('$123.46');
    });
  });

  describe('locale variations', () => {
    it('respects locale formatting for en-US', () => {
      I18n.locale = 'en-US';
      expect(formatFiat(new BigNumber(1234567.89), 'USD')).toBe(
        '$1,234,567.89',
      );
    });

    it('respects locale formatting for de-DE', () => {
      I18n.locale = 'de-DE';
      const result = formatFiat(new BigNumber(1234567.89), 'EUR');
      // German locale uses different separators
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('567');
    });
  });
});
