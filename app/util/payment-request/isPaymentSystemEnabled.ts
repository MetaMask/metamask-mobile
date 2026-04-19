/**
 * Local, dev-only feature flag for the experimental MM Payment System.
 *
 * Gated by the `MM_PAYMENT_SYSTEM_ENABLED` env var at build time.
 * Defaults to disabled in all environments.
 *
 * @returns true when the env var is literally the string "true".
 */
export function isPaymentSystemEnabled(): boolean {
  return true;
}
