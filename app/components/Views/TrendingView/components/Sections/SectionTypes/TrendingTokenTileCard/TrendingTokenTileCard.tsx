import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../../component-library/hooks';
import SparklineChart from '../../../../../Homepage/Sections/Perpetuals/components/SparklineChart';
import TrendingTokenLogo from '../../../../../../UI/Trending/components/TrendingTokenLogo';
import { TimeOption } from '../../../../../../UI/Trending/components/TrendingTokensBottomSheet';
import { getPriceChangeFieldKey } from '../../../../../../UI/Trending/components/TrendingTokenRowItem/utils';
import type { Theme } from '../../../../../../../util/theme/models';

const DEFAULT_CARD_WIDTH = 180;
const DEFAULT_CARD_HEIGHT = 180;
const SPARKLINE_HEIGHT = 80;
const SPARKLINE_STROKE_WIDTH = 2;
const TOKEN_LOGO_SIZE = 40;
const SHIMMER_PULSE_DURATION = 900;
const SPARKLINE_MARGIN = 16;
const CARD_BORDER_RADIUS = 12;

const styleSheet = (params: {
  theme: Theme;
  vars: { cardWidth: number; cardHeight: number };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    card: {
      width: vars.cardWidth,
      height: vars.cardHeight,
      backgroundColor: theme.colors.background.section,
      borderRadius: CARD_BORDER_RADIUS,
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sparklineContainer: {
      marginTop: 'auto' as const,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    shimmerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.icon.alternative,
      borderRadius: CARD_BORDER_RADIUS,
    },
  });
};

export interface TrendingTokenTileCardProps {
  token: TrendingAsset;
  sparklineData?: number[];
  onPress?: () => void;
  cardWidth?: number;
  cardHeight?: number;
  testID?: string;
}

const TrendingTokenTileCard: React.FC<TrendingTokenTileCardProps> = ({
  token,
  sparklineData,
  onPress,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
  testID = 'trending-token-tile-card',
}) => {
  const { styles, theme } = useStyles(styleSheet, { cardWidth, cardHeight });

  const { changeLabel, isPositive, showChange, isNeutral } = useMemo(() => {
    const key = getPriceChangeFieldKey(TimeOption.TwentyFourHours);
    const raw = token.priceChangePct?.[key];
    const n = raw !== undefined && raw !== null ? parseFloat(String(raw)) : NaN;
    if (isNaN(n)) {
      return {
        changeLabel: undefined as string | undefined,
        isPositive: true,
        showChange: false,
        isNeutral: false,
      };
    }
    if (n === 0) {
      return {
        changeLabel: '0.00%',
        isPositive: true,
        showChange: true,
        isNeutral: true,
      };
    }
    return {
      changeLabel: `${n > 0 ? '+' : '-'}${Math.abs(n).toFixed(2)}%`,
      isPositive: n > 0,
      showChange: true,
      isNeutral: false,
    };
  }, [token.priceChangePct]);

  const sparklineColor = isPositive
    ? theme.colors.success.default
    : theme.colors.error.default;

  const sparklineWidth = cardWidth - SPARKLINE_MARGIN * 2;
  const hasSparkline = Boolean(sparklineData && sparklineData.length >= 2);
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <View style={styles.content}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          gap={2}
        >
          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
            >
              {token.symbol}
            </Text>
            {showChange && changeLabel !== undefined ? (
              <Text
                variant={TextVariant.BodySm}
                color={
                  isNeutral
                    ? TextColor.TextAlternative
                    : isPositive
                      ? TextColor.SuccessDefault
                      : TextColor.ErrorDefault
                }
                numberOfLines={1}
                twClassName="shrink"
              >
                {changeLabel}
              </Text>
            ) : null}
          </Box>
          <TrendingTokenLogo
            assetId={token.assetId}
            symbol={token.symbol}
            size={TOKEN_LOGO_SIZE}
            recyclingKey={token.assetId}
          />
        </Box>
      </View>

      <View style={styles.sparklineContainer}>
        {hasSparkline && (
          <SparklineChart
            data={sparklineData as number[]}
            width={sparklineWidth}
            strokeWidth={SPARKLINE_STROKE_WIDTH}
            height={SPARKLINE_HEIGHT}
            color={sparklineColor}
            gradientId={`trending-sparkline-${token.assetId}`}
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
          testID="trending-tile-shimmer"
        />
      )}
    </TouchableOpacity>
  );
};

export default React.memo(TrendingTokenTileCard);
