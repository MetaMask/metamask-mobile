import { renderHook } from '@testing-library/react-hooks';
import { useTokenInputAreaFormattedBalance } from '.';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import I18n from '../../../../../../locales/i18n';

jest.mock('../../../../../../locales/i18n', () => ({
  locale: 'en',
}));

const mockI18n = I18n as unknown as { locale: string };

const makeToken = (overrides?: Partial<BridgeToken>): BridgeToken => ({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
  chainId: CHAIN_IDS.MAINNET,
  ...overrides,
});

describe('useTokenInputAreaFormattedBalance', () => {
  beforeEach(() => {
    mockI18n.locale = 'en';
  });

  describe('guard clauses', () => {
    it('returns undefined when token is undefined', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('100', undefined),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when token has no symbol', () => {
      const token = makeToken({ symbol: '' });

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('100', token),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when tokenBalance is undefined', () => {
      const token = makeToken();

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance(undefined, token),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when tokenBalance is empty string', () => {
      const token = makeToken();

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('', token),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when both token and tokenBalance are missing', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance(undefined, undefined),
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('minimum display threshold', () => {
    const token = makeToken();

    it('returns "< 0.00001" for a value just below threshold', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('0.000009', token),
      );

      expect(result.current).toBe('< 0.00001');
    });

    it('returns "< 0.00001" for extremely small positive values', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('0.000000000000000001', token),
      );

      expect(result.current).toBe('< 0.00001');
    });

    it('does not trigger for value equal to threshold (0.00001)', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('0.00001', token),
      );

      expect(result.current).not.toBe('< 0.00001');
      expect(result.current).toBe('0.00001');
    });

    it('does not trigger for value above threshold', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('0.0001', token),
      );

      expect(result.current).not.toBe('< 0.00001');
      expect(result.current).toBe('0.0001');
    });

    it('does not trigger for zero', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('0', token),
      );

      expect(result.current).toBe('0');
    });

    it('does not trigger for negative values', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('-0.000001', token),
      );

      // parseAmount can't parse negative numbers (regex doesn't match "-")
      // so it falls back to raw tokenBalance
      expect(result.current).toBe('-0.000001');
    });
  });

  describe('integer values', () => {
    const token = makeToken();

    it('formats a single digit', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('5', token),
      );

      expect(result.current).toBe('5');
    });

    it('formats a three-digit number without grouping', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('999', token),
      );

      expect(result.current).toBe('999');
    });

    it('formats thousands with grouping separator', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1000', token),
      );

      expect(result.current).toBe('1,000');
    });

    it('formats millions with grouping separators', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1234567', token),
      );

      expect(result.current).toBe('1,234,567');
    });

    it('formats billions', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1000000000', token),
      );

      expect(result.current).toBe('1,000,000,000');
    });

    it('strips leading zeros from integers', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('007', token),
      );

      expect(result.current).toBe('7');
    });
  });

  describe('decimal values', () => {
    const token = makeToken();

    it('preserves up to 5 decimal places', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1.12345', token),
      );

      expect(result.current).toBe('1.12345');
    });

    it('truncates beyond 5 decimal places', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1.123456789', token),
      );

      expect(result.current).toBe('1.12345');
    });

    it('trims trailing zeros after truncation', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1.10000', token),
      );

      expect(result.current).toBe('1.1');
    });

    it('formats decimal with thousands in integer part', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('12345.6789', token),
      );

      expect(result.current).toBe('12,345.6789');
    });

    it('handles value with only a fractional part', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('.5', token),
      );

      expect(result.current).toBe('0.5');
    });
  });

  describe('very large numbers', () => {
    const token = makeToken();

    it('formats a 12-digit integer', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('999999999999', token),
      );

      expect(result.current).toBe('999,999,999,999');
    });

    it('formats a large number with decimals', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('123456789.12345', token),
      );

      expect(result.current).toBe('123,456,789.12345');
    });

    it('handles numbers beyond safe integer range', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('99999999999999999999', token),
      );

      expect(result.current).toMatch(/^[\d,]+$/);
    });
  });

  describe('parseAmount fallback', () => {
    const token = makeToken();

    it('returns raw tokenBalance for strings with commas', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1,234.56', token),
      );

      // parseAmount regex doesn't match commas, returns undefined → fallback
      expect(result.current).toBe('1,234.56');
    });

    it('returns raw tokenBalance for scientific notation', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1e3', token),
      );

      expect(result.current).toBe('1e3');
    });

    it('returns raw tokenBalance for non-numeric strings', () => {
      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('abc', token),
      );

      expect(result.current).toBe('abc');
    });
  });

  describe('locale formatting', () => {
    const token = makeToken();

    it('formats with German locale (period grouping, comma decimal)', () => {
      mockI18n.locale = 'de-DE';

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1234567.89', token),
      );

      expect(result.current).toMatch(/1\.234\.567/);
      expect(result.current).toMatch(/,89$/);
    });

    it('formats with French locale (space grouping, comma decimal)', () => {
      mockI18n.locale = 'fr-FR';

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1234567.89', token),
      );

      // French uses narrow no-break space (U+202F) or non-breaking space for grouping
      expect(result.current).toMatch(/1\s234\s567/);
      expect(result.current).toMatch(/,89$/);
    });

    it('formats integers with German locale', () => {
      mockI18n.locale = 'de-DE';

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('50000', token),
      );

      expect(result.current).toBe('50.000');
    });

    it('formats integers with Japanese locale', () => {
      mockI18n.locale = 'ja-JP';

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1000000', token),
      );

      expect(result.current).toBe('1,000,000');
    });

    it('formats small number without grouping regardless of locale', () => {
      mockI18n.locale = 'de-DE';

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('999', token),
      );

      expect(result.current).toBe('999');
    });

    it('preserves threshold message regardless of locale', () => {
      mockI18n.locale = 'de-DE';

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('0.000001', token),
      );

      expect(result.current).toBe('< 0.00001');
    });

    it('formats with Portuguese (Brazil) locale', () => {
      mockI18n.locale = 'pt-BR';

      const { result } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1234.56', token),
      );

      expect(result.current).toMatch(/1\.234/);
      expect(result.current).toMatch(/,56$/);
    });
  });

  describe('memoization', () => {
    it('returns same reference when inputs do not change', () => {
      const token = makeToken();

      const { result, rerender } = renderHook(() =>
        useTokenInputAreaFormattedBalance('1000', token),
      );

      const firstResult = result.current;

      rerender();

      expect(result.current).toBe(firstResult);
    });
  });
});
