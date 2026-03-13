import { extractOrderCode } from './extractOrderCode';

describe('extractOrderCode', () => {
  it('extracts order code from full path', () => {
    expect(extractOrderCode('/providers/paypal/orders/abc-123')).toBe(
      'abc-123',
    );
  });

  it('returns plain order code unchanged', () => {
    expect(extractOrderCode('abc-123')).toBe('abc-123');
  });

  it('handles path with different provider', () => {
    expect(extractOrderCode('/providers/moonpay/orders/xyz-789')).toBe(
      'xyz-789',
    );
  });

  it('returns empty string when path ends with /orders/ and nothing after', () => {
    expect(extractOrderCode('/orders/')).toBe('');
  });
});
