import type { Position } from '@metamask/social-controllers';
import React, { useMemo } from 'react';
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
  // Memoise on primitive fields so the target reference stays stable while
  // the underlying position doesn't change. Without this, every parent
  // re-render produces a new target object, which destabilises `destToken`
  // inside `useQuickBuySetup`, which in turn re-triggers `useQuickBuyQuotes`'
  // fetch effect — aborting in-flight quotes before they resolve and leaving
  // the spinner stuck on.
  // Stabilise `target` across renders so it doesn't destabilise the
  // `destToken` memo inside `useQuickBuySetup` (which would in turn re-trigger
  // `useQuickBuyQuotes`' fetch effect and abort in-flight quotes).
  const target = useMemo(
    () => (position ? positionToQuickBuyTarget(position) : null),
    [position],
  );

  const analyticsContext = useMemo(() => {
    const hasAny =
      traderAddress !== undefined ||
      marketCap !== undefined ||
      source !== undefined;
    return hasAny ? { traderAddress, marketCap, source } : undefined;
  }, [traderAddress, marketCap, source]);

  return (
    <QuickBuy.Root
      isVisible={isVisible}
      target={target}
      onClose={onClose}
      features={TOP_TRADERS_QUICK_BUY_FEATURES}
      analyticsContext={analyticsContext}
    />
  );
};

export default TraderPositionQuickBuy;
