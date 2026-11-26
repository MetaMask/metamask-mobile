import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../hooks/useStyles';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { usePerpsLivePrices } from '../../../../../../UI/Perps/hooks/stream';
import PerpsLeverage from '../../../../../../UI/Perps/components/PerpsLeverage/PerpsLeverage';
import PerpsTokenLogo from '../../../../../../UI/Perps/components/PerpsTokenLogo';
import SparklineChart from '../SparklineChart';
import styleSheet from './PerpsMarketTileCard.styles';
import type { PerpsMarketTileCardProps } from './PerpsMarketTileCard.types';
import {
  getPerpsTileDisplayValues,
  getPerpsTileLivePriceThrottleMs,
  type PerpsTileChangeDirection,
  type PerpsTileDisplayValues,
} from './PerpsMarketTileCard.utils';
import {
  HomepagePerpsSelectorsIDs,
  homepagePerpsMarketTileCardPriceTestId,
} from '../../../../Homepage.testIds';

const DEFAULT_CARD_WIDTH = 188;
const DEFAULT_CARD_HEIGHT = 188;
const SPARKLINE_HEIGHT = 86;
const SPARKLINE_STROKE_WIDTH = 2;
const TOKEN_LOGO_SIZE = 32;
const SHIMMER_PULSE_DURATION = 900;
const SPARKLINE_MARGIN = 16;

const NO_LIVE_PRICE_SYMBOLS: string[] = [];

const CHANGE_TEXT_COLORS: Record<PerpsTileChangeDirection, TextColor> = {
  up: TextColor.SuccessDefault,
  down: TextColor.ErrorDefault,
  unknown: TextColor.TextAlternative,
};

type PerpsMarketTileCardContentProps = Omit<
  PerpsMarketTileCardProps,
  'deviceCapability'
> &
  PerpsTileDisplayValues;

const PerpsMarketTileCardContent: React.FC<PerpsMarketTileCardContentProps> = ({
  market,
  price,
  changePercent,
  changeDirection,
  sparklineData,
  onPress,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
  showFavoriteTag = false,
  testID = HomepagePerpsSelectorsIDs.MARKET_TILE_CARD,
}) => {
  const { styles, theme } = useStyles(styleSheet, { cardWidth, cardHeight });

  const sparklineColors: Record<PerpsTileChangeDirection, string> = {
    up: theme.colors.success.default,
    down: theme.colors.error.default,
    unknown: theme.colors.text.alternative,
  };
  const sparklineColor = sparklineColors[changeDirection];

  const sparklineWidth = cardWidth - SPARKLINE_MARGIN * 2;
  const hasSparkline = sparklineData && sparklineData.length >= 2;
  const isSparklineLoading = sparklineData !== undefined && !hasSparkline;

  const shimmerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isSparklineLoading) {
      shimmerOpacity.stopAnimation();
      return;
    }

    const pulse = () => {
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 1,
          duration: SHIMMER_PULSE_DURATION,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0,
          duration: SHIMMER_PULSE_DURATION,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]).start(({ finished }) => {
        if (finished) pulse();
      });
    };

    pulse();

    return () => shimmerOpacity.stopAnimation();
  }, [isSparklineLoading, shimmerOpacity]);

  const handlePress = () => {
    onPress?.(market);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={testID}
    >
      <View style={styles.content}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          gap={2}
        >
          <View style={styles.tokenLogoWrapper}>
            <PerpsTokenLogo
              symbol={market.symbol}
              size={TOKEN_LOGO_SIZE}
              recyclingKey={market.symbol}
            />
            {showFavoriteTag && (
              <View
                style={styles.favoriteBadge}
                testID={`favorite-badge-${market.symbol}`}
              >
                <Icon
                  name={IconName.StarFilled}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </View>
            )}
          </View>

          <Box className="flex-1 min-w-0">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
                className="shrink"
              >
                {getPerpsDisplaySymbol(market.symbol)}
              </Text>
              <PerpsLeverage maxLeverage={market.maxLeverage} />
            </Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                className="shrink"
                testID={homepagePerpsMarketTileCardPriceTestId(
                  testID,
                  market.symbol,
                )}
              >
                {price}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={CHANGE_TEXT_COLORS[changeDirection]}
                numberOfLines={1}
              >
                {changePercent}
              </Text>
            </Box>
          </Box>
        </Box>
      </View>

      <View style={styles.sparklineContainer}>
        {hasSparkline && (
          <SparklineChart
            data={sparklineData}
            width={sparklineWidth}
            strokeWidth={SPARKLINE_STROKE_WIDTH}
            height={SPARKLINE_HEIGHT}
            color={sparklineColor}
            gradientId={`sparkline-${market.symbol}`}
            revealColor={theme.colors.background.section}
            showGradient={false}
          />
        )}
      </View>

      {isSparklineLoading && (
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              opacity: shimmerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.15],
              }),
            },
          ]}
          pointerEvents="none"
          testID="shimmer-overlay"
        />
      )}
    </TouchableOpacity>
  );
};

const MemoizedPerpsMarketTileCardContent = React.memo(
  PerpsMarketTileCardContent,
);

/**
 * PerpsMarketTileCard — compact card for horizontal carousels.
 */
const PerpsMarketTileCard: React.FC<PerpsMarketTileCardProps> = ({
  deviceCapability,
  ...props
}) => {
  const throttleMs = getPerpsTileLivePriceThrottleMs(deviceCapability);
  const livePrices = usePerpsLivePrices({
    symbols:
      throttleMs === null ? NO_LIVE_PRICE_SYMBOLS : [props.market.symbol],
    throttleMs: throttleMs ?? undefined,
  });
  const { price, changePercent, changeDirection } = getPerpsTileDisplayValues(
    props.market,
    livePrices[props.market.symbol],
  );

  return (
    <MemoizedPerpsMarketTileCardContent
      {...props}
      price={price}
      changePercent={changePercent}
      changeDirection={changeDirection}
    />
  );
};

export default React.memo(PerpsMarketTileCard);
