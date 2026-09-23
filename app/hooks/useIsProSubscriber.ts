import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

export interface UseProAccessResult {
  isProSubscriber: boolean;
  isProAccessUnknown: boolean;
}

/**
 * Returns Plus access as two booleans for chrome that only needs to know
 * whether the user is a subscriber, or whether that answer is still unknown.
 */
export function useProAccess(): UseProAccessResult {
  const access = useMoneyAccountPlusAccess();

  return {
    isProSubscriber: access === MoneyAccountPlusAccess.Subscriber,
    isProAccessUnknown: access === MoneyAccountPlusAccess.Unknown,
  };
}

/**
 * Returns whether the user may see subscriber-only Pro chrome.
 *
 * True only when {@link useMoneyAccountPlusAccess} reports
 * {@link MoneyAccountPlusAccess.Subscriber}.
 */
export function useIsProSubscriber(): boolean {
  return useProAccess().isProSubscriber;
}
