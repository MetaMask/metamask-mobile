import React, { useCallback, useState } from 'react';
import { useABTest } from '../../../../hooks/useABTest';
import { ImpactMoment, playImpact } from '../../../../util/haptics';
import {
  SOCIAL_AI_QUICK_BUY_AB_KEY,
  SOCIAL_AI_QUICK_BUY_EXPOSURE_METADATA,
  SOCIAL_AI_QUICK_BUY_VARIANTS,
} from '../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/abTestConfig';
import AssetDetailsQuickBuy from '../components/AssetDetailsQuickBuy';
import type { QuickBuySheetSource } from '../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/analytics';
import type { TokenDetailsRouteParams } from '../constants/constants';

interface UseStickyQuickBuyArgs {
  token: TokenDetailsRouteParams | null | undefined;
  source: QuickBuySheetSource;
  /** Optional per-surface callback invoked after haptic feedback and before the sheet opens. Use for surface-specific analytics. */
  onPress?: () => void;
}

interface UseStickyQuickBuyResult {
  isQuickBuyEnabled: boolean;
  /** Undefined when the quick-buy A/B flag is off; pass directly to TokenDetailsStickyFooter. */
  onQuickBuyPress: (() => void) | undefined;
  /** Null when the quick-buy A/B flag is off; render this node at the bottom of the screen. */
  quickBuySheet: React.ReactNode;
}

/**
 * Encapsulates all quick-buy wiring: A/B flag read, visibility state, haptic
 * press handler, and the AssetDetailsQuickBuy sheet element.
 */
export function useStickyQuickBuy({
  token,
  source,
  onPress,
}: UseStickyQuickBuyArgs): UseStickyQuickBuyResult {
  const { variant: quickBuyVariant } = useABTest(
    SOCIAL_AI_QUICK_BUY_AB_KEY,
    SOCIAL_AI_QUICK_BUY_VARIANTS,
    SOCIAL_AI_QUICK_BUY_EXPOSURE_METADATA,
  );
  const isQuickBuyEnabled = quickBuyVariant.showQuickBuy;

  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);

  const handleQuickBuyPress = useCallback(() => {
    playImpact(ImpactMoment.PrimaryCTA);
    onPress?.();
    setIsQuickBuyVisible(true);
  }, [onPress]);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  return {
    isQuickBuyEnabled,
    onQuickBuyPress: isQuickBuyEnabled ? handleQuickBuyPress : undefined,
    quickBuySheet: isQuickBuyEnabled ? (
      <AssetDetailsQuickBuy
        isVisible={isQuickBuyVisible}
        token={token ?? null}
        onClose={handleQuickBuyClose}
        source={source}
      />
    ) : null,
  };
}
