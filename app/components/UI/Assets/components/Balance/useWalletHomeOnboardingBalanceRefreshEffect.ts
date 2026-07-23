import { useEffect, useRef } from 'react';
import { useBalanceRefresh } from '../../../../Views/Wallet/hooks/useBalanceRefresh';

interface UseWalletHomeOnboardingBalanceRefreshEffectParams {
  enabled: boolean;
}

export function useWalletHomeOnboardingBalanceRefreshEffect({
  enabled,
}: UseWalletHomeOnboardingBalanceRefreshEffectParams): void {
  const { refreshBalance } = useBalanceRefresh();
  const refreshRequestedRef = useRef(false);

  useEffect(() => {
    if (!enabled || refreshRequestedRef.current) {
      return;
    }

    refreshRequestedRef.current = true;
    void refreshBalance();
  }, [enabled, refreshBalance]);
}
