import { useCallback } from 'react';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { useWalletHomeOnboardingTradeSwapPair } from './useWalletHomeOnboardingTradeSwapPair';

type GoToSwapsFromSwapBridgeNavigation = ReturnType<
  typeof import('../Bridge/hooks/useSwapBridgeNavigation').useSwapBridgeNavigation
>['goToSwaps'];

/**
 * Opens unified swaps from the wallet home onboarding trade step (TMCU-681) with
 * source/dest defaults based on mainnet mUSD or ETH balance.
 */
export function useWalletHomeOnboardingChecklistTradePress(
  goToSwaps: GoToSwapsFromSwapBridgeNavigation,
): () => void {
  const swapPair = useWalletHomeOnboardingTradeSwapPair();

  return useCallback(() => {
    if (swapPair) {
      goToSwaps(
        swapPair.sourceToken,
        swapPair.destToken,
        undefined,
        undefined,
        ActionLocation.ONBOARDING_CHECKLIST,
      );
      return;
    }

    goToSwaps(
      undefined,
      undefined,
      undefined,
      undefined,
      ActionLocation.ONBOARDING_CHECKLIST,
    );
  }, [goToSwaps, swapPair]);
}
