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
  // Stabilise the derived `target` reference so it doesn't destabilise the
  // `destToken` memo inside `useQuickBuySetup` (which would in turn re-trigger
  // `useQuickBuyQuotes`' fetch effect and abort in-flight quotes).
  //
  // `position` is reference-stable upstream — it's either a nav-param value or
  // the cached result of `useTraderPosition` — so memoising on it is enough.
  // If a future caller starts allocating a fresh `Position` on every render,
  // switch to primitive-field deps (tokenAddress, tokenSymbol, tokenName, chain).
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
