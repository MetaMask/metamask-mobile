import type { Position } from '@metamask/social-controllers';
import React from 'react';
import QuickBuySheet from './QuickBuySheet';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import { positionToQuickBuyTarget, type QuickBuySheetProps } from './types';

export interface TraderPositionQuickBuyProps
  extends Omit<QuickBuySheetProps, 'target'> {
  position: Position | null;
}

/**
 * Top Traders adapter — maps social `Position` to `QuickBuyTarget`.
 */
const TraderPositionQuickBuy: React.FC<TraderPositionQuickBuyProps> = ({
  position,
  isVisible,
  onClose,
  traderAddress,
  marketCap,
  source,
}) => (
  <QuickBuySheet
    isVisible={isVisible}
    target={position ? positionToQuickBuyTarget(position) : null}
    onClose={onClose}
    traderAddress={traderAddress}
    marketCap={marketCap}
    source={source}
    features={TOP_TRADERS_QUICK_BUY_FEATURES}
  />
);

export default TraderPositionQuickBuy;
