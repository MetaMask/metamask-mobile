import { useEffect } from 'react';
import { FeatureId } from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';

/**
 * Explore Quick Buy uses shared Quick Buy quote fetching, which maps explore
 * analytics sources to `FeatureId.UNKNOWN`. While the Explore sheet is open,
 * bridge quote requests should use `FeatureId.QUICK_BUY_EXPLORE` instead.
 *
 * Scoped to the Explore adapter so Social Leaderboard Quick Buy code stays
 * unchanged and owned by the Explore surface.
 */
export function useExploreQuickBuyBridgeFeatureId(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const controller = Engine.context.BridgeController;
    const originalFetchQuotes = controller.fetchQuotes;

    controller.fetchQuotes = (params, featureId, signal) =>
      originalFetchQuotes.call(
        controller,
        params,
        featureId === FeatureId.UNKNOWN
          ? FeatureId.QUICK_BUY_EXPLORE
          : featureId,
        signal,
      );

    return () => {
      controller.fetchQuotes = originalFetchQuotes;
    };
  }, [isActive]);
}
