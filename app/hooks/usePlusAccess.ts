import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

export interface UsePlusAccessResult {
  isPlusSubscriber: boolean;
  isPlusAccessUnknown: boolean;
}

/**
 * Returns Plus access as two booleans for chrome that only needs to know
 * whether the user is a subscriber, or whether that answer is still unknown.
 */
export function usePlusAccess(): UsePlusAccessResult {
  const access = useMoneyAccountPlusAccess();

  return {
    isPlusSubscriber: access === MoneyAccountPlusAccess.Subscriber,
    isPlusAccessUnknown: access === MoneyAccountPlusAccess.Unknown,
  };
}

/**
 * Returns whether the user may see subscriber-only Plus chrome.
 *
 * True only when {@link useMoneyAccountPlusAccess} reports
 * {@link MoneyAccountPlusAccess.Subscriber}.
 */
export function useIsPlusSubscriber(): boolean {
  return usePlusAccess().isPlusSubscriber;
}
