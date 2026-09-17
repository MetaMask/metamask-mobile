import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

/**
 * Returns whether the user may see subscriber-only Pro chrome.
 *
 * True only when {@link useMoneyAccountPlusAccess} reports
 * {@link MoneyAccountPlusAccess.Subscriber}.
 */
export function useIsProSubscriber(): boolean {
  return useMoneyAccountPlusAccess() === MoneyAccountPlusAccess.Subscriber;
}
