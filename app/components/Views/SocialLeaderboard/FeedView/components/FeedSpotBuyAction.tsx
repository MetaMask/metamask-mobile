import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../../UI/Bridge/hooks/useSwapBridgeNavigation';
import type { BridgeToken } from '../../../../UI/Bridge/types';
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

const targetKey = (target: QuickBuyTarget): string =>
  `${target.chain}:${target.tokenAddress}`;

export interface FeedSpotBuyActionHandle {
  /** Open the buy flow for a spot feed item (QuickBuy in control, swaps in treatment). */
  open: (target: QuickBuyTarget) => void;
}

interface SwapDestResolverProps {
  target: QuickBuyTarget;
  onResolved: (destToken: BridgeToken) => void;
  onUnresolvable: () => void;
}

/**
 * Resolves a single tapped token into a destination BridgeToken for swaps.
 *
 * This is mounted per-target (via `key`) so every buy gets a FRESH
 * `useQuickBuySetup` instance. A fresh instance starts its async metadata
 * resolution from `pending: true` and never surfaces a previous target's
 * lagging data, so we can't navigate to swaps with a stale / wrong-decimals
 * token or fall back to QuickBuy before the fetch has actually run.
 *
 * Renders nothing; it reports back through the callbacks exactly once.
 */
const SwapDestResolver: React.FC<SwapDestResolverProps> = ({
  target,
  onResolved,
  onUnresolvable,
}) => {
  const { destToken, isLoading } = useQuickBuySetup(target);
  const settledRef = useRef(false);

  useEffect(() => {
    if (settledRef.current) return;

    if (destToken) {
      settledRef.current = true;
      onResolved(destToken);
      return;
    }

    // Only treat "no token" as final once the metadata fetch has settled
    // (natives / unsupported chains never enter a loading phase, real tokens do).
    if (!isLoading) {
      settledRef.current = true;
      onUnresolvable();
    }
  }, [destToken, isLoading, onResolved, onUnresolvable]);

  return null;
};

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

  const [quickBuyTarget, setQuickBuyTarget] = useState<QuickBuyTarget | null>(
    null,
  );
  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);
  // When set, a keyed <SwapDestResolver> is mounted to resolve this token and
  // navigate to swaps (treatment only).
  const [swapTarget, setSwapTarget] = useState<QuickBuyTarget | null>(null);

  // TODO: switch `location` to `SwapBridgeNavigationLocation.FollowTradingFeedScreen`
  // once that value lands in the `@metamask/bridge-controller`
  // `MetaMetricsSwapsEventSource` enum.
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: FOLLOW_TRADER_SWAPS_SOURCE_PAGE,
  });

  const openQuickBuy = useCallback((target: QuickBuyTarget) => {
    setQuickBuyTarget(target);
    setIsQuickBuyVisible(true);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      open: (nextTarget: QuickBuyTarget) => {
        if (variant.openSwaps) {
          setSwapTarget(nextTarget);
        } else {
          openQuickBuy(nextTarget);
        }
      },
    }),
    [variant.openSwaps, openQuickBuy],
  );

  const handleSwapResolved = useCallback(
    (destToken: BridgeToken) => {
      setSwapTarget(null);
      goToSwaps(undefined, destToken, undefined, true);
    },
    [goToSwaps],
  );

  // Metadata couldn't be resolved (e.g. unsupported chain / unknown token) —
  // fall back to QuickBuy so Buy is never a no-op.
  const handleSwapUnresolvable = useCallback(() => {
    if (swapTarget) {
      openQuickBuy(swapTarget);
    }
    setSwapTarget(null);
  }, [swapTarget, openQuickBuy]);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  return (
    <>
      {swapTarget && (
        <SwapDestResolver
          key={targetKey(swapTarget)}
          target={swapTarget}
          onResolved={handleSwapResolved}
          onUnresolvable={handleSwapUnresolvable}
        />
      )}

      <QuickBuy.Root
        isVisible={isQuickBuyVisible}
        target={quickBuyTarget}
        onClose={handleQuickBuyClose}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        analyticsContext={{ source: 'trader_feed' }}
      />
    </>
  );
});

export default FeedSpotBuyAction;
