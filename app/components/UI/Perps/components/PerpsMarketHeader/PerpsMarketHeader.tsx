import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_COLLATERAL_SYMBOL } from '../../constants/perpsConfig';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import PerpsMarketIdentity from '../PerpsMarketIdentity';
import PerpsModeToggle from '../PerpsModeToggle';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  PERPS_MARKET_HEADER_HEIGHT,
  type PerpsMarketHeaderProps,
} from './PerpsMarketHeader.types';

export { PERPS_MARKET_HEADER_HEIGHT };

const COMPACT_PRICE_ENTER_OFFSET_PX = 8;
const SUBTITLE_CROSSFADE_HEIGHT = 20;

const styles = StyleSheet.create({
  container: {
    height: PERPS_MARKET_HEADER_HEIGHT,
  },
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
  sizer: {
    opacity: 0,
  },
});

const PerpsMarketIdentitySubtitle = ({
  symbol,
  testID,
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

const PerpsMarketHeaderCompactPrice = ({
  symbol,
  currentPrice,
  percentChange24h,
  testIDPrice,
  testIDChange,
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
 * Fixed market-detail header shared by Lite and Pro screens.
 *
 * Left: back button. Center: tappable asset identity with optional
 * subtitle/compact-price crossfade. Right: default action row or
 * `endAccessory` override.
 */
const PerpsMarketHeader = ({
  market,
  testIDs,
  onBackPress,
  onIdentityPress,
  showMarketIdentity = true,
  endAccessory,
  onWalletPress,
  onFavoritePress,
  isFavorite = false,
  mode,
  onModeChange,
  scrollY,
  priceSectionHeight,
}: PerpsMarketHeaderProps) => {
  const fallbackScrollY = useSharedValue(0);
  const fallbackPriceSectionHeight = useSharedValue(0);
  const scrollYSv = scrollY ?? fallbackScrollY;
  const priceSectionHeightSv = priceSectionHeight ?? fallbackPriceSectionHeight;

  const compactProgress = useSharedValue(0);

  useAnimatedReaction(
    () => {
      const hasMeasured = priceSectionHeightSv.value > 0;
      return hasMeasured && scrollYSv.value >= priceSectionHeightSv.value;
    },
    (isCompact, previousIsCompact) => {
      if (isCompact === previousIsCompact) return;
      compactProgress.value = withTiming(isCompact ? 1 : 0, {
        duration: AnimationDuration.Fast,
      });
    },
  );

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
      <Box style={styles.sizer} pointerEvents="none">
        <PerpsMarketIdentitySubtitle symbol={market.symbol} testID="" />
        <PerpsMarketHeaderCompactPrice
          symbol={market.symbol}
          currentPrice={currentPrice}
          percentChange24h={percentChange24h}
          testIDPrice=""
          testIDChange=""
        />
      </Box>
      <Animated.View style={[styles.crossfadeLayer, subtitleLayerStyle]}>
        <PerpsMarketIdentitySubtitle
          symbol={market.symbol}
          testID={testIDs.subtitle}
        />
      </Animated.View>
      <Animated.View style={[styles.crossfadeLayer, priceLayerStyle]}>
        <PerpsMarketHeaderCompactPrice
          symbol={market.symbol}
          currentPrice={currentPrice}
          percentChange24h={percentChange24h}
          testIDPrice={testIDs.headerPrice}
          testIDChange={testIDs.headerPriceChange}
        />
      </Animated.View>
    </Box>
  );

  const rightActions =
    endAccessory ??
    (onWalletPress || onFavoritePress || (onModeChange && mode) ? (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {onWalletPress ? (
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="size-10"
          >
            <ButtonIcon
              iconName={IconName.Wallet}
              size={ButtonIconSize.Md}
              onPress={onWalletPress}
              accessibilityLabel={strings('perps.market_details.wallet')}
              testID={testIDs.walletButton}
            />
          </Box>
        ) : null}
        {onFavoritePress ? (
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="size-10"
          >
            <ButtonIcon
              iconName={isFavorite ? IconName.StarFilled : IconName.Star}
              size={ButtonIconSize.Md}
              onPress={onFavoritePress}
              accessibilityLabel={strings(
                isFavorite
                  ? 'perps.market_details.remove_from_watchlist'
                  : 'perps.market_details.add_to_watchlist',
              )}
              testID={testIDs.favoriteButton}
            />
          </Box>
        ) : null}
        {onModeChange && mode ? (
          <Box justifyContent={BoxJustifyContent.Center} twClassName="h-10">
            <PerpsModeToggle
              mode={mode}
              variant="active"
              onChange={onModeChange}
              source={PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN}
            />
          </Box>
        ) : null}
      </Box>
    ) : null);

  return (
    <Box
      testID={testIDs.container}
      style={styles.container}
      twClassName="border-b border-muted bg-default px-4"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
    >
      {onBackPress ? (
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Sm}
          onPress={onBackPress}
          accessibilityLabel={strings('perps.market_details.back')}
          testID={testIDs.backButton}
        />
      ) : null}

      <Box twClassName="flex-1">
        {showMarketIdentity ? (
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
              assetIcon: testIDs.assetIcon,
              assetName: testIDs.assetName,
              subtitle: testIDs.subtitle,
              marketListButton: testIDs.marketListButton,
            }}
          />
        ) : null}
      </Box>

      {rightActions}
    </Box>
  );
};

export default PerpsMarketHeader;
