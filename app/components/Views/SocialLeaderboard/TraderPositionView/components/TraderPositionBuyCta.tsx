import type { Position } from '@metamask/social-controllers';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../../../UI/Bridge/hooks/useSwapBridgeNavigation';
import {
  TOP_TRADERS_BUY_ACTION_AB_KEY,
  TOP_TRADERS_BUY_ACTION_EXPOSURE_METADATA,
  TOP_TRADERS_BUY_ACTION_VARIANTS,
} from '../abTestConfig';
import TraderPositionQuickBuy, { positionToQuickBuyTarget } from './QuickBuy';
import { useQuickBuySetup } from './QuickBuy/hooks/useQuickBuySetup';
import type {
  QuickBuyOriginalEntryPoint,
  QuickBuySheetSource,
} from './QuickBuy/analytics';

/**
 * `sourcePage` reported to the swaps view for attribution. Snake_case matches
 * the social "follow trading" event family and the free-form `sourcePage`
 * convention (unlike the Title-Cased `MetaMetricsSwapsEventSource` enum values).
 */
const FOLLOW_TRADER_SWAPS_SOURCE_PAGE = 'follow_trader';

export interface TraderPositionBuyCtaProps {
  /** The spot position being viewed. `null` while the position is resolving. */
  position: Position | null;
  traderAddress?: string;
  marketCap?: number;
  /** Latest buy-token price in the user's display currency (chart feed). */
  tokenPriceFiat?: number;
  source?: QuickBuySheetSource;
  originalEntryPoint?: QuickBuyOriginalEntryPoint;
  /** `true` when the trader has closed the position (sell); `false` when open. */
  isTraderPositionClosed?: boolean;
  /**
   * Fires the follow-trading CTA-clicked analytics and marks the CTA as clicked
   * so the parent's "dismissed" event is suppressed. Called for both variants.
   */
  onBuyCtaClicked: () => void;
  buyButtonTestID: string;
}

/**
 * Spot Buy CTA for the trader position screen, gated by the Top Traders Buy
 * Action A/B test (`socialAiTSA901AbtestTopTradersBuyAction`).
 *
 * - control: tapping Buy opens the QuickBuy sheet (existing behavior).
 * - treatment: tapping Buy opens the main swaps view with the trader's token
 * pre-filled as the destination (buy intent).
 *
 * Rendering this component (spot-only) is what scopes the experiment exposure
 * to spot positions — perps never mount it, so perps users are never exposed.
 */
const TraderPositionBuyCta: React.FC<TraderPositionBuyCtaProps> = ({
  position,
  traderAddress,
  marketCap,
  tokenPriceFiat,
  source,
  originalEntryPoint,
  isTraderPositionClosed,
  onBuyCtaClicked,
  buyButtonTestID,
}) => {
  const { variant } = useABTest(
    TOP_TRADERS_BUY_ACTION_AB_KEY,
    TOP_TRADERS_BUY_ACTION_VARIANTS,
    TOP_TRADERS_BUY_ACTION_EXPOSURE_METADATA,
  );

  const isFocused = useIsFocused();

  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);
  // Treatment tapped Buy before the destination metadata finished resolving —
  // hold the intent and navigate once it settles (rather than falling back).
  const [isSwapPending, setIsSwapPending] = useState(false);

  const target = useMemo(
    () => (position ? positionToQuickBuyTarget(position) : null),
    [position],
  );

  // Resolve the token the user is buying into a full BridgeToken (decimals /
  // image / hex chainId) so it can be pre-filled as the swaps destination.
  // `target` is stable for the lifetime of this screen, so `destToken` /
  // `isLoading` always reflect the current position (no stale-carryover).
  const { destToken, isLoading } = useQuickBuySetup(target);

  // TODO: switch `location` to `SwapBridgeNavigationLocation.FollowTrader` once
  // the `follow_trader` value lands in the `@metamask/bridge-controller`
  // `MetaMetricsSwapsEventSource` enum.
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: FOLLOW_TRADER_SWAPS_SOURCE_PAGE,
  });

  const handleBuyPress = useCallback(() => {
    if (!position) return;
    // Primary CTA opening the buy flow — distinct from tab-bar `TabChange`.
    playImpact(ImpactMoment.PrimaryCTA);
    onBuyCtaClicked();

    // Treatment: go straight to swaps with the trader's token as destination.
    if (variant.openSwaps) {
      if (destToken) {
        // Clear any pending intent so the resolver effect can't also navigate.
        setIsSwapPending(false);
        goToSwaps(undefined, destToken, undefined, true);
        return;
      }
      // Metadata still resolving — wait for it instead of falling back so a
      // fast tap doesn't send treatment users to QuickBuy.
      if (isLoading) {
        setIsSwapPending(true);
        return;
      }
      // Settled with no usable token (e.g. unsupported chain) — fall through to
      // QuickBuy so Buy is never a no-op.
      setIsSwapPending(false);
    }

    setIsQuickBuyVisible(true);
  }, [
    position,
    onBuyCtaClicked,
    variant.openSwaps,
    destToken,
    isLoading,
    goToSwaps,
  ]);

  // Resolve a pending treatment intent once the destination metadata settles.
  useEffect(() => {
    if (!isSwapPending) return;
    // The user left the screen while metadata was resolving — cancel the intent
    // so we never navigate (or open QuickBuy) from a backgrounded screen.
    if (!isFocused) {
      setIsSwapPending(false);
      return;
    }
    if (destToken) {
      setIsSwapPending(false);
      goToSwaps(undefined, destToken, undefined, true);
      return;
    }
    if (!isLoading) {
      setIsSwapPending(false);
      setIsQuickBuyVisible(true);
    }
  }, [isSwapPending, isFocused, destToken, isLoading, goToSwaps]);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  return (
    <>
      <Box twClassName="px-4 py-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleBuyPress}
          testID={buyButtonTestID}
        >
          {strings('social_leaderboard.trader_position.buy')}
        </Button>
      </Box>

      <TraderPositionQuickBuy
        isVisible={isQuickBuyVisible}
        position={position}
        onClose={handleQuickBuyClose}
        traderAddress={traderAddress}
        marketCap={marketCap}
        tokenPriceFiat={tokenPriceFiat}
        source={source}
        originalEntryPoint={originalEntryPoint}
        isTraderPositionClosed={isTraderPositionClosed}
      />
    </>
  );
};

export default TraderPositionBuyCta;
