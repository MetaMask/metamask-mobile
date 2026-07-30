import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  PerpsMode,
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '../../../../../../../locales/i18n';
import { PERPS_COLLATERAL_SYMBOL } from '../../../constants/perpsConfig';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import LivePriceHeader from '../../../components/LivePriceDisplay/LivePriceHeader';
import PerpsMarketIdentity from '../../../components/PerpsMarketIdentity';
import PerpsModeToggle from '../../../components/PerpsModeToggle';
import { usePerpsLivePrices } from '../../../hooks/stream';

/** Fixed header height, in px. */
export const PERPS_PRO_MARKET_HEADER_HEIGHT = 64;

const COMPACT_PRICE_ENTER_OFFSET_PX = 8;
const SUBTITLE_CROSSFADE_HEIGHT = 20;

interface PerpsProMarketHeaderProps {
  /**
   * Market payload from route params. After the parent has verified
   * `symbol`, remaining fields may still be partial (deep-link entries).
   */
  market: Partial<PerpsMarketData> & { symbol: string };
  /**
   * Active Perps mode for the read-only mode pill. Required when
   * `onModeChange` is provided; ignored otherwise.
   */
  mode?: PerpsMode;
  onBackPress?: () => void;
  /**
   * When provided, the asset identity (icon + name + leverage) becomes a tap
   * target that opens the market list, and a trailing caret is shown.
   */
  onIdentityPress?: () => void;
  onWalletPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  onModeChange?: (mode: PerpsMode) => void;
  /**
   * Scroll offset from the parent's `Animated.ScrollView`, shared via
   * `useHeaderStandardAnimated()`. Drives the subtitle/price crossfade.
   * Omit for a static header (e.g. unit tests) — the subtitle is then
   * always shown.
   */
  scrollY?: SharedValue<number>;
  /**
   * Height of the scrollable price section above the header's threshold
   * (e.g. `PRICE_SECTION_HEIGHT` from `PerpsProMarketSummary`). Once
   * `scrollY` reaches this value, the header is considered "compact".
   */
  priceSectionHeight?: SharedValue<number>;
}

const styles = StyleSheet.create({
  container: {
    height: PERPS_PRO_MARKET_HEADER_HEIGHT,
  },
  // Matches the Figma title cap so long names truncate instead of pushing the
  // leverage tag / caret out of view.
  nameText: {
    maxWidth: 120,
  },
  subtitleCrossfade: {
    height: SUBTITLE_CROSSFADE_HEIGHT,
    justifyContent: 'center',
  },
  crossfadeLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  // Invisible, non-interactive stack of both crossfade candidates so the
  // container is sized to fit whichever is widest — absolutely positioned
  // siblings (the actual visible layers) don't otherwise contribute to
  // their parent's intrinsic width, which was squeezing/ellipsizing
  // whichever text is naturally wider than the identity's first row.
  sizer: {
    opacity: 0,
  },
});

/** Static `[Ticker]-[collateral] perp` subtitle — same copy as the default
 * `PerpsMarketIdentity` subtitle, duplicated here so it can live in one
 * crossfade layer alongside the compact price in the other. */
const PerpsMarketIdentitySubtitle = ({
  symbol,
  testID = PerpsProMarketViewSelectorsIDs.HEADER_SUBTITLE,
}: {
  symbol: string;
  testID?: string;
}) => (
  <Text
    variant={TextVariant.BodySm}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextAlternative}
    numberOfLines={1}
    testID={testID}
  >
    {strings('perps.market_details.perp_pair', {
      ticker: getPerpsDisplaySymbol(symbol),
      collateral: PERPS_COLLATERAL_SYMBOL,
    })}
  </Text>
);

/** Compact live price shown in the header once it has scrolled past the
 * price section. Presentational only — the header subscribes to live prices
 * once and passes the values down, since this renders twice (visible layer
 * + invisible width sizer). */
const PerpsProMarketHeaderCompactPrice = ({
  symbol,
  currentPrice,
  percentChange24h,
  testIDPrice = PerpsProMarketViewSelectorsIDs.HEADER_PRICE,
  testIDChange = PerpsProMarketViewSelectorsIDs.HEADER_PRICE_CHANGE,
}: {
  symbol: string;
  currentPrice: number;
  percentChange24h?: number;
  testIDPrice?: string;
  testIDChange?: string;
}) => (
  <LivePriceHeader
    symbol={symbol}
    currentPrice={currentPrice}
    percentChange24h={percentChange24h}
    testIDPrice={testIDPrice}
    testIDChange={testIDChange}
  />
);

/**
 * Fixed Pro-mode market header.
 *
 * Left: back button. Center: tappable asset identity (token icon, name,
 * leverage pill, market-list caret, and `[Ticker]-[collateral] perp`
 * subtitle). Right: wallet, favorite (watchlist star), and the read-only
 * Lite/Pro mode pill. Background is a solid, always-opaque `bg-default`
 * with a bottom border — no scroll-linked transparency.
 *
 * When `scrollY`/`priceSectionHeight` are wired up (see
 * `PerpsProMarketView`), the subtitle crossfades into a compact live price
 * once the price section above has scrolled behind the header.
 */
const PerpsProMarketHeader = ({
  market,
  mode,
  onBackPress,
  onIdentityPress,
  onWalletPress,
  onFavoritePress,
  isFavorite = false,
  onModeChange,
  scrollY,
  priceSectionHeight,
}: PerpsProMarketHeaderProps) => {
  const fallbackScrollY = useSharedValue(0);
  const fallbackPriceSectionHeight = useSharedValue(0);
  const scrollYSv = scrollY ?? fallbackScrollY;
  const priceSectionHeightSv = priceSectionHeight ?? fallbackPriceSectionHeight;

  const compactProgress = useDerivedValue(() => {
    const hasMeasured = priceSectionHeightSv.value > 0;
    const isCompact =
      hasMeasured && scrollYSv.value >= priceSectionHeightSv.value;
    return withTiming(isCompact ? 1 : 0, {
      duration: AnimationDuration.Fast,
    });
  });

  const subtitleLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - compactProgress.value,
    transform: [
      {
        translateY: compactProgress.value * COMPACT_PRICE_ENTER_OFFSET_PX,
      },
    ],
  }));

  const priceLayerStyle = useAnimatedStyle(() => ({
    opacity: compactProgress.value,
    transform: [
      {
        translateY: (1 - compactProgress.value) * COMPACT_PRICE_ENTER_OFFSET_PX,
      },
    ],
  }));

  // Subscribed once here (rather than inside the compact price layer) since
  // it's now rendered twice below — once as the visible crossfade layer,
  // once as an invisible width sizer — and a live-price hook subscription
  // shouldn't be duplicated for that.
  const livePrices = usePerpsLivePrices({
    symbols: [market.symbol],
    throttleMs: 1000,
  });
  const priceData = livePrices[market.symbol];
  const currentPrice = priceData?.price ? parseFloat(priceData.price) : 0;
  const percentChange24h =
    priceData?.percentChange24h !== undefined
      ? parseFloat(priceData.percentChange24h)
      : undefined;

  const displaySubtitleAndPrice = (
    <Box style={styles.subtitleCrossfade}>
      {/* Invisible sizer — blank testIDs so it doesn't collide with the
          visible layer's below when queried in tests. */}
      <Box style={styles.sizer} pointerEvents="none">
        <PerpsMarketIdentitySubtitle symbol={market.symbol} testID="" />
        <PerpsProMarketHeaderCompactPrice
          symbol={market.symbol}
          currentPrice={currentPrice}
          percentChange24h={percentChange24h}
          testIDPrice=""
          testIDChange=""
        />
      </Box>
      <Animated.View style={[styles.crossfadeLayer, subtitleLayerStyle]}>
        <PerpsMarketIdentitySubtitle symbol={market.symbol} />
      </Animated.View>
      <Animated.View style={[styles.crossfadeLayer, priceLayerStyle]}>
        <PerpsProMarketHeaderCompactPrice
          symbol={market.symbol}
          currentPrice={currentPrice}
          percentChange24h={percentChange24h}
        />
      </Animated.View>
    </Box>
  );

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.HEADER}
      style={styles.container}
      twClassName="border-b border-muted bg-default px-2"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
    >
      {onBackPress ? (
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={onBackPress}
          accessibilityLabel={strings('perps.market_details.back')}
          testID={PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON}
        />
      ) : null}

      <Box twClassName="flex-1">
        <PerpsMarketIdentity
          symbol={market.symbol}
          name={market.name}
          maxLeverage={market.maxLeverage}
          size={32}
          gap={2}
          nameStyle={styles.nameText}
          onPress={onIdentityPress}
          subtitleContent={displaySubtitleAndPrice}
          testIDs={{
            assetIcon: PerpsProMarketViewSelectorsIDs.HEADER_ASSET_ICON,
            assetName: PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL,
            subtitle: PerpsProMarketViewSelectorsIDs.HEADER_SUBTITLE,
            marketListButton:
              PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON,
          }}
        />
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {onWalletPress ? (
          <ButtonIcon
            iconName={IconName.Wallet}
            size={ButtonIconSize.Md}
            onPress={onWalletPress}
            accessibilityLabel={strings('perps.market_details.wallet')}
            testID={PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON}
          />
        ) : null}
        {onFavoritePress ? (
          <ButtonIcon
            iconName={isFavorite ? IconName.StarFilled : IconName.Star}
            size={ButtonIconSize.Md}
            onPress={onFavoritePress}
            accessibilityLabel={strings(
              isFavorite
                ? 'perps.market_details.remove_from_watchlist'
                : 'perps.market_details.add_to_watchlist',
            )}
            testID={PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON}
          />
        ) : null}
        {onModeChange && mode ? (
          <PerpsModeToggle
            mode={mode}
            variant="active"
            onChange={onModeChange}
            source={PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN}
          />
        ) : null}
      </Box>
    </Box>
  );
};

export default PerpsProMarketHeader;
