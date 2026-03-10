import { extractOrderCode } from './extractOrderCode';

describe('extractOrderCode', () => {
  it('extracts order code from full path', () => {
    expect(extractOrderCode('/providers/paypal/orders/abc-123')).toBe(
      'abc-123',
    );
    expect(extractOrderCode('/providers/transak/orders/xyz')).toBe('xyz');
  });

  it('returns string unchanged when no /orders/ segment', () => {
    expect(extractOrderCode('plain-order-id')).toBe('plain-order-id');
    expect(extractOrderCode('abc123')).toBe('abc123');
  });
});
