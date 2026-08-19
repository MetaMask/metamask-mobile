import { extractOrderCode } from './extractOrderCode';

describe('extractOrderCode', () => {
  it('extracts code from full path with /orders/', () => {
    expect(extractOrderCode('/providers/paypal/orders/abc-123')).toBe(
      'abc-123',
    );
  });

  it('returns plain order code as-is when path has no /orders/', () => {
    expect(extractOrderCode('abc-123')).toBe('abc-123');
  });

  it('extracts code when path has multiple segments after /orders/', () => {
    expect(extractOrderCode('/providers/paypal/orders/ORDER-XYZ-789')).toBe(
      'ORDER-XYZ-789',
    );
  });

  it('returns empty string when path ends with /orders/', () => {
    expect(extractOrderCode('/providers/paypal/orders/')).toBe('');
  });
});
