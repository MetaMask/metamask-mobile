import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

/**
 * Returns whether the user may see subscriber-only Pro chrome.
 *
 * True only when {@link useMoneyAccountPlusAccess} reports
 * {@link MoneyAccountPlusAccess.Subscriber}. While entitlements are still
 * resolving (`Loading`), or when the user is `Eligible` or `Disabled`, this
 * is false so the Money CTA cannot flash Pro or open the hub from a stale
 * persisted claim.
 */
export function useIsProSubscriber(): boolean {
  return useMoneyAccountPlusAccess() === MoneyAccountPlusAccess.Subscriber;
}
