import { useCallback, useEffect, useRef } from 'react';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { useWalletHomeOnboardingTradeSwapPair } from './useWalletHomeOnboardingTradeSwapPair';
import { useSwapBridgeNavigation } from '../Bridge/hooks/useSwapBridgeNavigation';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';

/**
 * Opens unified swaps from the wallet home onboarding trade step (TMCU-681) with
 * source/dest defaults based on mainnet mUSD or ETH balance.
 */
export function useWalletHomeOnboardingChecklistTradePress(): () => void {
  const swapPair = useWalletHomeOnboardingTradeSwapPair();
  const swapPairRef = useRef(swapPair);

  const { goToSwaps } = useSwapBridgeNavigation({
    location: MetaMetricsSwapsEventSource.MainView,
    sourcePage: 'MainView',
  });

  useEffect(() => {
    swapPairRef.current = swapPair;
  }, [swapPair]);

  return useCallback(() => {
    const pair = swapPairRef.current;

    if (pair) {
      goToSwaps({
        sourceTokenOverride: pair.sourceToken,
        destTokenOverride: pair.destToken,
        swapButtonClickLocationOverride: ActionLocation.ONBOARDING_CHECKLIST,
      });
      return;
    }

    goToSwaps({
      swapButtonClickLocationOverride: ActionLocation.ONBOARDING_CHECKLIST,
    });
  }, [goToSwaps]);
}
