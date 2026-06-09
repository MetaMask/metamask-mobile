import { isProviderLimitError } from './isProviderLimitError';

describe('isProviderLimitError', () => {
  it.each([null, undefined, ''])('returns false for %p', (value) => {
    expect(isProviderLimitError(value)).toBe(false);
  });

  it('matches a minimum purchase limit message', () => {
    expect(isProviderLimitError('Minimum purchase is 12 EUR')).toBe(true);
  });

  it('matches a maximum purchase limit message', () => {
    expect(isProviderLimitError('Maximum purchase is 20000 USD')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isProviderLimitError('minimum purchase is 5 usd')).toBe(true);
    expect(isProviderLimitError('MAXIMUM PURCHASE IS 100 GBP')).toBe(true);
  });

  it('tolerates extra whitespace between words', () => {
    expect(isProviderLimitError('Minimum  purchase   is 5 EUR')).toBe(true);
  });

  it.each([
    '[object Object]',
    // Legacy phrasing that must NOT be surfaced anymore (it was the regression).
    'Amount below minimum 25 USD',
    'Amount is outside the supported range',
    'Validation error: payment method not supported',
    '503 Service Unavailable',
    '<html><body>Bad Gateway</body></html>',
    'minimum amount required',
    'purchase is unavailable',
  ])('returns false for non-limit message %p', (message) => {
    expect(isProviderLimitError(message)).toBe(false);
  });
});
