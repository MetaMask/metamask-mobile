import type { Position } from '@metamask/social-controllers';
import React, { useMemo } from 'react';
import type { QuickBuySheetSource } from '../../../analytics';
import { QuickBuy } from './quickBuy';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import {
  positionToQuickBuyTarget,
  type QuickBuyAnalyticsContext,
} from './types';

export interface TraderPositionQuickBuyProps {
  isVisible: boolean;
  position: Position | null;
  onClose: () => void;
  traderAddress?: string;
  marketCap?: number;
  source?: QuickBuySheetSource;
  /** `true` when the trader has closed the position (sell); `false` when still open (buy). */
  isTraderPositionClosed?: boolean;
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
  isTraderPositionClosed,
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
  ); // `null` when position is null OR when its chain name has no CAIP mapping

  const analyticsContext = useMemo((): QuickBuyAnalyticsContext | undefined => {
    const traderTradeType: QuickBuyAnalyticsContext['traderTradeType'] =
      isTraderPositionClosed === undefined
        ? undefined
        : isTraderPositionClosed
          ? 'sell'
          : 'buy';
    const hasAny =
      traderAddress !== undefined ||
      marketCap !== undefined ||
      source !== undefined ||
      traderTradeType !== undefined;
    return hasAny
      ? { traderAddress, marketCap, source, traderTradeType }
      : undefined;
  }, [traderAddress, marketCap, source, isTraderPositionClosed]);

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
