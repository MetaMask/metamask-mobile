import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import {
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
import { truncateText } from '../../../../../../UI/Perps/utils/textUtils';
import PerpsLeverage from '../../../../../../UI/Perps/components/PerpsLeverage/PerpsLeverage';
import PerpsTokenLogo from '../../../../../../UI/Perps/components/PerpsTokenLogo';
import SparklineChart from '../SparklineChart';
import styleSheet from './PerpsMarketTileCard.styles';
import type { PerpsMarketTileCardProps } from './PerpsMarketTileCard.types';

const DEFAULT_CARD_WIDTH = 180;
const DEFAULT_CARD_HEIGHT = 180;
const MAX_TICKER_LENGTH = 8;
const SPARKLINE_HEIGHT = 80;
const SPARKLINE_STROKE_WIDTH = 2;
const TOKEN_LOGO_SIZE = 40;
const SHIMMER_PULSE_DURATION = 900;
const SPARKLINE_MARGIN = 16;

/**
 * PerpsMarketTileCard — compact card for horizontal carousels.
 * Uses static market data only (no live price subscription).
 */
const PerpsMarketTileCard: React.FC<PerpsMarketTileCardProps> = ({
  market,
  sparklineData,
  onPress,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
  showFavoriteTag = false,
  testID = 'perps-market-tile-card',
}) => {
  const { styles, theme } = useStyles(styleSheet, { cardWidth, cardHeight });

  const { changePercent, isPositive } = useMemo(
    () => ({
      changePercent: market.change24hPercent,
      isPositive: !market.change24hPercent.startsWith('-'),
    }),
    [market.change24hPercent],
  );

  const sparklineColor = isPositive
    ? theme.colors.success.default
    : theme.colors.error.default;

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
        <View style={styles.topRow}>
          <View style={styles.symbolSection}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {truncateText(
                getPerpsDisplaySymbol(market.symbol),
                MAX_TICKER_LENGTH,
              )}
            </Text>

            <Text
              variant={TextVariant.BodySm}
              color={
                isPositive ? TextColor.SuccessDefault : TextColor.ErrorDefault
              }
            >
              {changePercent}
            </Text>

            <PerpsLeverage maxLeverage={market.maxLeverage} />
          </View>

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
        </View>
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

export default React.memo(PerpsMarketTileCard);
