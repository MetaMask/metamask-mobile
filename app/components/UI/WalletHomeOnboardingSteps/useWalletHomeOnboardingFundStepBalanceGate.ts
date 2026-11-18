import { useEffect, useRef, useState, type RefObject } from 'react';

/** Debounce before auto-advancing fund step on a positive aggregate balance. */
export const WALLET_HOME_ONBOARDING_FUND_STEP_POSITIVE_BALANCE_DEBOUNCE_MS = 300;

interface AccountGroupBalanceSnapshot {
  totalBalanceInUserCurrency: number;
}

export interface UseWalletHomeOnboardingFundStepBalanceGateParams {
  /** Wallet-home post-onboarding flow is active on fund step (step 0). */
  enabled: boolean;
  accountGroupBalance: AccountGroupBalanceSnapshot | null;
  /** Selected account group; gate state resets when this changes. */
  groupId: string | null;
}

function clearTimeoutRef(
  timeoutRef: RefObject<ReturnType<typeof setTimeout> | null>,
): void {
  if (timeoutRef.current !== null) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

/**
 * Determines when fund-step auto-advance may run: on an imported wallet whose balance loads
 * late, or when funds arrive while the checklist is visible, however long after it appeared.
 *
 * Selector updates re-run this hook (no engine event subscriptions). Positive balances
 * are debounced so a stale positive-then-zero flash does not advance the checklist.
 */
export function useWalletHomeOnboardingFundStepBalanceGate({
  enabled,
  accountGroupBalance,
  groupId,
}: UseWalletHomeOnboardingFundStepBalanceGateParams): boolean {
  const [canAdvanceFundStepAfterBalance, setCanAdvanceFundStepAfterBalance] =
    useState(false);
  const positiveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const trackedGroupIdRef = useRef<string | null>(null);
  const accountGroupBalanceRef = useRef(accountGroupBalance);
  accountGroupBalanceRef.current = accountGroupBalance;

  useEffect(
    () => () => {
      clearTimeoutRef(positiveDebounceRef);
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      clearTimeoutRef(positiveDebounceRef);
      trackedGroupIdRef.current = null;
      setCanAdvanceFundStepAfterBalance(false);
      return;
    }

    if (trackedGroupIdRef.current !== groupId) {
      clearTimeoutRef(positiveDebounceRef);
      trackedGroupIdRef.current = groupId;
      setCanAdvanceFundStepAfterBalance(false);
    }

    const balance = accountGroupBalance?.totalBalanceInUserCurrency ?? null;
    const isPositive = balance !== null && balance > 0;

    if (isPositive) {
      if (positiveDebounceRef.current !== null) {
        return;
      }

      positiveDebounceRef.current = setTimeout(() => {
        positiveDebounceRef.current = null;
        const latestBalance =
          accountGroupBalanceRef.current?.totalBalanceInUserCurrency ?? null;
        if (latestBalance !== null && latestBalance > 0) {
          setCanAdvanceFundStepAfterBalance(true);
        }
      }, WALLET_HOME_ONBOARDING_FUND_STEP_POSITIVE_BALANCE_DEBOUNCE_MS);

      return () => {
        clearTimeoutRef(positiveDebounceRef);
      };
    }

    clearTimeoutRef(positiveDebounceRef);
    setCanAdvanceFundStepAfterBalance(false);

    return () => {
      clearTimeoutRef(positiveDebounceRef);
    };
  }, [accountGroupBalance, enabled, groupId]);

  return canAdvanceFundStepAfterBalance;
}
