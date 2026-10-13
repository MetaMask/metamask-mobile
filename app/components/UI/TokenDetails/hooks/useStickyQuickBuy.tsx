import React, { useCallback, useState } from 'react';
import { ImpactMoment, playImpact } from '../../../../util/haptics';
import AssetDetailsQuickBuy from '../components/AssetDetailsQuickBuy';
import type { QuickBuySheetSource } from '../../QuickBuy/analytics';
import type { QuickBuyTradeMode } from '../../QuickBuy/types';
import type { TokenDetailsRouteParams } from '../constants/constants';

interface UseStickyQuickBuyArgs {
  token: TokenDetailsRouteParams | null | undefined;
  source: QuickBuySheetSource;
  /** Optional per-surface callback invoked after haptic feedback and before the sheet opens. Use for surface-specific analytics. */
  onPress?: () => void;
}

interface UseStickyQuickBuyResult {
  /** Pass directly to TokenDetailsStickyFooter. */
  onQuickBuyPress: () => void;
  openQuickBuy: (mode: QuickBuyTradeMode) => void;
  /** Render this node at the bottom of the screen. */
  quickBuySheet: React.ReactNode;
}

/**
 * Encapsulates all quick-buy wiring: visibility state, haptic press handler,
 * and the AssetDetailsQuickBuy sheet element.
 */
export function useStickyQuickBuy({
  token,
  source,
  onPress,
}: UseStickyQuickBuyArgs): UseStickyQuickBuyResult {
  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);
  const [initialTradeMode, setInitialTradeMode] =
    useState<QuickBuyTradeMode>('buy');

  const openQuickBuy = useCallback(
    (mode: QuickBuyTradeMode) => {
      playImpact(ImpactMoment.PrimaryCTA);
      onPress?.();
      setInitialTradeMode(mode);
      setIsQuickBuyVisible(true);
    },
    [onPress],
  );

  const handleQuickBuyPress = useCallback(
    () => openQuickBuy('buy'),
    [openQuickBuy],
  );

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  return {
    onQuickBuyPress: handleQuickBuyPress,
    openQuickBuy,
    quickBuySheet: (
      <AssetDetailsQuickBuy
        isVisible={isQuickBuyVisible}
        token={token ?? null}
        onClose={handleQuickBuyClose}
        source={source}
        initialTradeMode={initialTradeMode}
      />
    ),
  };
}
