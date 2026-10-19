import { useCallback, useEffect, useRef } from 'react';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { useWalletHomeOnboardingTradeSwapPair } from './useWalletHomeOnboardingTradeSwapPair';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../Bridge/hooks/useSwapBridgeNavigation';

/**
 * Opens unified swaps from the wallet home onboarding trade step (TMCU-681) with
 * source/dest defaults based on mainnet mUSD or ETH balance.
 */
export function useWalletHomeOnboardingChecklistTradePress(): () => void {
  const swapPair = useWalletHomeOnboardingTradeSwapPair();
  const swapPairRef = useRef(swapPair);

  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.MainView,
    sourcePage: 'MainView',
  });

  useEffect(() => {
    swapPairRef.current = swapPair;
  }, [swapPair]);

  return useCallback(() => {
    const pair = swapPairRef.current;

    if (pair) {
      goToSwaps(
        pair.sourceToken,
        pair.destToken,
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
  }, [goToSwaps]);
}
