import { PaymentType } from '@consensys/on-ramp-sdk';
import { parseRampPaymentType } from './parseRampPaymentType';

describe('parseRampPaymentType', () => {
  it('returns undefined for null, undefined, or empty string', () => {
    expect(parseRampPaymentType(null)).toBeUndefined();
    expect(parseRampPaymentType(undefined)).toBeUndefined();
    expect(parseRampPaymentType('')).toBeUndefined();
  });

  it('returns the matching PaymentType for known API strings', () => {
    expect(parseRampPaymentType('apple-pay')).toBe(PaymentType.ApplePay);
    expect(parseRampPaymentType(PaymentType.DebitCreditCard)).toBe(
      PaymentType.DebitCreditCard,
    );
    expect(parseRampPaymentType('rev-pay')).toBe(PaymentType.RevPay);
  });

  it('returns undefined for unknown strings', () => {
    expect(parseRampPaymentType('not-a-real-method')).toBeUndefined();
  });
});
