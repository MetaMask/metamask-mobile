import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  type LayoutRectangle,
} from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { strings } from '../../../../../../../../locales/i18n';
import { playSelection } from '../../../../../../../util/haptics';
import { useTheme } from '../../../../../../../util/theme';
import type { QuickBuyTradeMode } from '../types';
import { useQuickBuyContext } from '../useQuickBuyContext';

const styles = StyleSheet.create({
  // Inner row owns the relative positioning context. It carries no border or
  // padding, so the absolute slider's insets line up 1:1 with the buttons'
  // measured frames (the outer border would otherwise offset the slider by its
  // width, leaving a larger gap at the top than the bottom).
  row: {
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // Matches the buttons' rounded-lg (8px) so the fill tucks neatly behind them.
    borderRadius: 8,
  },
});

interface QuickBuyTradeModeToggleProps {
  testID?: string;
  buyOnly?: boolean;
}

const QuickBuyTradeModeToggle: React.FC<QuickBuyTradeModeToggleProps> = ({
  testID = 'quick-buy-trade-mode-toggle',
  buyOnly = false,
}) => {
  const { tradeMode, setTradeMode, hasSellableBalance } = useQuickBuyContext();
  const { colors } = useTheme();
  const buyColor = colors.success.default;
  const sellColor = brandColor.orange400;

  const slideProgress = useSharedValue(tradeMode === 'sell' ? 1 : 0);
  const buyWidthSV = useSharedValue(0);
  const buyXSV = useSharedValue(0);
  const sellWidthSV = useSharedValue(0);

  const prevTradeModeRef = useRef<QuickBuyTradeMode | null>(null);
  const [buyLayout, setBuyLayout] = useState<LayoutRectangle | null>(null);
  const [sellWidth, setSellWidth] = useState(0);

  const handlePress = (mode: QuickBuyTradeMode) => {
    if (tradeMode !== mode) {
      playSelection();
      setTradeMode(mode);
    }
  };

  useEffect(() => {
    if (buyOnly || !buyLayout) return;
    const target = tradeMode === 'buy' ? 0 : 1;

    if (prevTradeModeRef.current === null) {
      slideProgress.value = target;
      prevTradeModeRef.current = tradeMode;
      return;
    }

    if (prevTradeModeRef.current !== tradeMode) {
      prevTradeModeRef.current = tradeMode;
      slideProgress.value = withSpring(target, {
        duration: 150,
        dampingRatio: 0.75,
      });
    }
  }, [tradeMode, buyLayout, buyOnly, slideProgress]);

  const sliderStyle = useAnimatedStyle(() => {
    const progress = slideProgress.value;
    const width = interpolate(
      progress,
      [0, 1],
      [buyWidthSV.value, sellWidthSV.value],
    );

    return {
      left: buyXSV.value,
      width,
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        [buyColor, sellColor],
      ),
      transform: [{ translateX: progress * buyWidthSV.value }],
    };
  }, [buyColor, sellColor]);

  const sliderWidth = tradeMode === 'buy' ? (buyLayout?.width ?? 0) : sellWidth;

  if (buyOnly) {
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="border border-muted rounded-xl p-1"
        testID={testID}
      >
        <Box
          twClassName="rounded-lg px-4 py-1"
          style={{ backgroundColor: buyColor }}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryInverse}
          >
            {strings('social_leaderboard.quick_buy.buy_label')}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="border border-muted rounded-xl p-1"
      testID={testID}
    >
      <Box flexDirection={BoxFlexDirection.Row} style={styles.row}>
        {buyLayout && sliderWidth > 0 && (
          <Animated.View style={[styles.slider, sliderStyle]} />
        )}

        <TouchableOpacity
          onPress={() => handlePress('buy')}
          onLayout={(e) => {
            const layout = e.nativeEvent.layout;
            setBuyLayout(layout);
            buyWidthSV.value = layout.width;
            buyXSV.value = layout.x;
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: tradeMode === 'buy' }}
          testID="quick-buy-trade-mode-buy"
        >
          <Box twClassName="rounded-lg px-4 py-1">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={
                tradeMode === 'buy' ? FontWeight.Medium : FontWeight.Regular
              }
              color={
                tradeMode === 'buy'
                  ? TextColor.PrimaryInverse
                  : TextColor.TextDefault
              }
            >
              {strings('social_leaderboard.quick_buy.buy_label')}
            </Text>
          </Box>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handlePress('sell')}
          disabled={!hasSellableBalance}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            setSellWidth(width);
            sellWidthSV.value = width;
          }}
          accessibilityRole="button"
          accessibilityState={{
            selected: tradeMode === 'sell',
            disabled: !hasSellableBalance,
          }}
          testID="quick-buy-trade-mode-sell"
        >
          <Box
            twClassName={`rounded-lg px-4 py-1 ${!hasSellableBalance ? 'opacity-40' : ''}`}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={
                tradeMode === 'sell' ? FontWeight.Medium : FontWeight.Regular
              }
              color={
                tradeMode === 'sell'
                  ? TextColor.PrimaryInverse
                  : TextColor.TextDefault
              }
            >
              {strings('social_leaderboard.quick_buy.sell_label')}
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default QuickBuyTradeModeToggle;
