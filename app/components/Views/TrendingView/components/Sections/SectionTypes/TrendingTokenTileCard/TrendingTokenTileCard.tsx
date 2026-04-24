import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../../component-library/hooks';
import SparklineChart from '../../../../../Homepage/Sections/Perpetuals/components/SparklineChart';
import TrendingTokenLogo from '../../../../../../UI/Trending/components/TrendingTokenLogo';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';
import { TimeOption } from '../../../../../../UI/Trending/components/TrendingTokensBottomSheet';
import { getPriceChangeFieldKey } from '../../../../../../UI/Trending/components/TrendingTokenRowItem/utils';
import { formatPriceWithSubscriptNotation } from '../../../../../../UI/Predict/utils/format';
import useNetworkBadgeSource from '../../../../../../UI/Trending/hooks/useNetworkBadgeSource';
import type { Theme } from '../../../../../../../util/theme/models';

const DEFAULT_CARD_WIDTH = 180;
const DEFAULT_CARD_HEIGHT = 180;
const SPARKLINE_STROKE_WIDTH = 2;
const TOKEN_LOGO_SIZE = 28;
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      paddingBottom: 0,
    },
    tokenName: {
      flex: 1,
      marginRight: 6,
    },
    sparklineContainer: {
      flex: 1,
      overflow: 'hidden',
      marginHorizontal: SPARKLINE_MARGIN,
      marginVertical: 10,
    },
    priceContainer: {
      padding: 16,
      paddingTop: 6,
      paddingBottom: 12,
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

  const networkBadgeImageSource = useNetworkBadgeSource(token.assetId);

  const sparklineColor = isPositive
    ? theme.colors.success.default
    : theme.colors.error.default;

  const [sparklineLayout, setSparklineLayout] = useState({
    width: 0,
    height: 0,
  });
  const onSparklineLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSparklineLayout({ width, height });
  }, []);

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
      {/* Row 1: name + token icon with network badge */}
      <View style={styles.header}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          style={styles.tokenName}
        >
          {token.name ?? token.symbol}
        </Text>
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              size={AvatarSize.Xs}
              variant={BadgeVariant.Network}
              imageSource={networkBadgeImageSource}
              isScaled={false}
            />
          }
        >
          <TrendingTokenLogo
            assetId={token.assetId}
            symbol={token.symbol}
            size={TOKEN_LOGO_SIZE}
            recyclingKey={token.assetId}
          />
        </BadgeWrapper>
      </View>

      {/* Row 2: sparkline — flex:1 fills remaining vertical space */}
      <View style={styles.sparklineContainer} onLayout={onSparklineLayout}>
        {hasSparkline && sparklineLayout.width > 0 && (
          <SparklineChart
            data={sparklineData as number[]}
            width={sparklineLayout.width}
            strokeWidth={SPARKLINE_STROKE_WIDTH}
            height={sparklineLayout.height}
            color={sparklineColor}
            gradientId={`trending-sparkline-${token.assetId}`}
            revealColor={theme.colors.background.section}
            showGradient={false}
          />
        )}
      </View>

      {/* Row 3: price + price change */}
      <View style={styles.priceContainer}>
        <Text
          variant={TextVariant.BodyLg}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {formatPriceWithSubscriptNotation(token.price)}
        </Text>
        {showChange && changeLabel !== undefined ? (
          <Text
            variant={TextVariant.BodyMd}
            color={
              isNeutral
                ? TextColor.TextAlternative
                : isPositive
                  ? TextColor.SuccessDefault
                  : TextColor.ErrorDefault
            }
            numberOfLines={1}
          >
            {changeLabel}
          </Text>
        ) : null}
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
