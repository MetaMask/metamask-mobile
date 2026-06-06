import type { PaymentMethod } from '@metamask/ramps-controller';

/**
 * Selects the first payment method whose settlement delay is acceptable.
 *
 * A method is eligible when it has no `delay` band, or its upper-bound delay
 * (`delay[1]`, in minutes) does not exceed `maxDelayMinutes`. The list is
 * assumed to arrive in provider/backend preference order, so the first match
 * is the best eligible choice.
 *
 * Lives in the Ramp domain because payment-method `delay` semantics are
 * ramps-provider knowledge — consumers (e.g. MM Pay) should not re-implement
 * this rule.
 *
 * @param paymentMethods - Candidate payment methods, in preference order.
 * @param maxDelayMinutes - Maximum acceptable settlement delay, in minutes.
 * @returns The first eligible payment method, or `undefined` when none qualify.
 */
export function pickEligiblePaymentMethod(
  paymentMethods: PaymentMethod[],
  maxDelayMinutes: number,
): PaymentMethod | undefined {
  return paymentMethods.find(
    (pm) => !pm.delay || pm.delay[1] <= maxDelayMinutes,
  );
}

export default pickEligiblePaymentMethod;
