const FIAT_ORDER_DECLINE_PATTERN =
  /Fiat order (failed|cancelled|id_expired)\b/i;

/**
 * A terminal on-ramp order failure. A declined card is an expected outcome, not
 * an app error.
 */
export const isFiatOrderDeclineError = (message?: string): boolean =>
  typeof message === 'string' && FIAT_ORDER_DECLINE_PATTERN.test(message);
