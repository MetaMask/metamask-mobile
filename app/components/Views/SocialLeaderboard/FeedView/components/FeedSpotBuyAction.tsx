import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../../UI/Bridge/hooks/useSwapBridgeNavigation';
import {
  QuickBuy,
  TOP_TRADERS_QUICK_BUY_FEATURES,
  type QuickBuyTarget,
} from '../../TraderPositionView/components/QuickBuy';
import { useQuickBuySetup } from '../../TraderPositionView/components/QuickBuy/hooks/useQuickBuySetup';
import {
  TOP_TRADERS_BUY_ACTION_AB_KEY,
  TOP_TRADERS_BUY_ACTION_EXPOSURE_METADATA,
  TOP_TRADERS_BUY_ACTION_VARIANTS,
} from '../../TraderPositionView/abTestConfig';

/** Same `sourcePage` used by the trader position screen — see TraderPositionBuyCta. */
const FOLLOW_TRADER_SWAPS_SOURCE_PAGE = 'follow_trader';

export interface FeedSpotBuyActionHandle {
  /** Open the buy flow for a spot feed item (QuickBuy in control, swaps in treatment). */
  open: (target: QuickBuyTarget) => void;
}

/**
 * Orchestrates the spot Buy action for the trader feed, gated by the Top Traders
 * Buy Action A/B test (`socialAiTSA901AbtestTopTradersBuyAction`).
 *
 * - control: opens the QuickBuy sheet (existing feed behavior).
 * - treatment: opens the main swaps view with the tapped token as destination,
 * falling back to QuickBuy if the token metadata can't be resolved.
 *
 * Mounting is what scopes the experiment exposure: the parent only renders this
 * when the loaded feed contains at least one spot row, so perps-only / empty
 * feeds never expose the experiment. Interaction is imperative (via ref) because
 * the Trade buttons live inside the virtualized feed list.
 */
const FeedSpotBuyAction = forwardRef<FeedSpotBuyActionHandle>((_props, ref) => {
  const { variant } = useABTest(
    TOP_TRADERS_BUY_ACTION_AB_KEY,
    TOP_TRADERS_BUY_ACTION_VARIANTS,
    TOP_TRADERS_BUY_ACTION_EXPOSURE_METADATA,
  );

  const [target, setTarget] = useState<QuickBuyTarget | null>(null);
  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);
  const [isSwapPending, setIsSwapPending] = useState(false);

  // Resolves the tapped token into a full BridgeToken (decimals / hex chainId)
  // for the swaps destination. Keyed to the current target.
  const { destToken, isLoading } = useQuickBuySetup(target);

  // TODO: switch `location` to `SwapBridgeNavigationLocation.FollowTradingFeedScreen`
  // once that value lands in the `@metamask/bridge-controller`
  // `MetaMetricsSwapsEventSource` enum.
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: FOLLOW_TRADER_SWAPS_SOURCE_PAGE,
  });

  useImperativeHandle(
    ref,
    () => ({
      open: (nextTarget: QuickBuyTarget) => {
        setTarget(nextTarget);
        if (variant.openSwaps) {
          setIsSwapPending(true);
        } else {
          setIsQuickBuyVisible(true);
        }
      },
    }),
    [variant.openSwaps],
  );

  // Treatment: navigate to swaps once the destination token resolves. If the
  // metadata resolves with no usable token (e.g. unsupported chain), fall back
  // to QuickBuy so Buy is never a no-op.
  useEffect(() => {
    if (!isSwapPending) return;
    if (destToken) {
      setIsSwapPending(false);
      goToSwaps(undefined, destToken, undefined, true);
      return;
    }
    if (!isLoading) {
      setIsSwapPending(false);
      setIsQuickBuyVisible(true);
    }
  }, [isSwapPending, destToken, isLoading, goToSwaps]);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  return (
    <QuickBuy.Root
      isVisible={isQuickBuyVisible}
      target={target}
      onClose={handleQuickBuyClose}
      features={TOP_TRADERS_QUICK_BUY_FEATURES}
      analyticsContext={{ source: 'trader_feed' }}
    />
  );
});

export default FeedSpotBuyAction;
