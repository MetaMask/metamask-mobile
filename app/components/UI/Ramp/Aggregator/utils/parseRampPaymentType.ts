import { PaymentType } from '@consensys/on-ramp-sdk';

const RAMP_PAYMENT_TYPE_VALUES = new Set<string>(
  Object.values(PaymentType) as string[],
);

/**
 * Maps ramps `paymentType` strings to {@link PaymentType} when they match the SDK.
 * Unknown values (new API types not yet in the app) return `undefined` so callers can fall back.
 */
export function parseRampPaymentType(
  paymentType: string | PaymentType | undefined | null,
): PaymentType | undefined {
  if (paymentType == null || paymentType === '') {
    return undefined;
  }
  const asString = String(paymentType);
  return RAMP_PAYMENT_TYPE_VALUES.has(asString)
    ? (asString as PaymentType)
    : undefined;
}
