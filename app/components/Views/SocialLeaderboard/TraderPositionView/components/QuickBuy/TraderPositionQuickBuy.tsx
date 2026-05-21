import type { Position } from '@metamask/social-controllers';
import React from 'react';
import type { QuickBuySheetSource } from '../../../analytics';
import { QuickBuy } from './quickBuy';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import { positionToQuickBuyTarget } from './types';

export interface TraderPositionQuickBuyProps {
  isVisible: boolean;
  position: Position | null;
  onClose: () => void;
  traderAddress?: string;
  marketCap?: number;
  source?: QuickBuySheetSource;
}

/**
 * Top Traders adapter — maps social `Position` to `QuickBuyTarget` and
 * bundles leaderboard analytics into `analyticsContext`.
 */
const TraderPositionQuickBuy: React.FC<TraderPositionQuickBuyProps> = ({
  position,
  isVisible,
  onClose,
  traderAddress,
  marketCap,
  source,
}) => {
  const hasAnalyticsContext =
    traderAddress !== undefined ||
    marketCap !== undefined ||
    source !== undefined;

  return (
    <QuickBuy.Root
      isVisible={isVisible}
      target={position ? positionToQuickBuyTarget(position) : null}
      onClose={onClose}
      features={TOP_TRADERS_QUICK_BUY_FEATURES}
      analyticsContext={
        hasAnalyticsContext ? { traderAddress, marketCap, source } : undefined
      }
    />
  );
};

export default TraderPositionQuickBuy;
