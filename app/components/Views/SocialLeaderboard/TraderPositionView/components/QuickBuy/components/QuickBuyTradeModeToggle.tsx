import React, { useRef, useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  type LayoutRectangle,
} from 'react-native';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useQuickBuyContext } from '../useQuickBuyContext';
import type { QuickBuyTradeMode } from '../types';
import { useTheme } from '../../../../../../../util/theme';
import { playSelection } from '../../../../../../../util/haptics';
import { brandColor } from '@metamask/design-tokens';

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
  const slideAnim = useRef(new Animated.Value(0)).current;
  // Tracks whether the slider has been placed once since mount. The toggle can
  // mount already in "sell" (e.g. returning from a subsheet, where tradeMode
  // persists in context). In that case the first placement must jump straight
  // to the correct position instead of springing from buy.
  const hasPositioned = useRef(false);
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
    const toValue = tradeMode === 'buy' ? 0 : buyLayout.width;
    if (!hasPositioned.current) {
      // First placement after layout: snap to the current mode so a toggle
      // that mounts in "sell" doesn't play a parasite buy -> sell animation.
      slideAnim.setValue(toValue);
      hasPositioned.current = true;
      return;
    }
    Animated.spring(slideAnim, {
      toValue,
      // Color interpolation (backgroundColor below) is not supported by the
      // native driver, so the slide must run on the JS driver too.
      useNativeDriver: false,
      tension: 180,
      friction: 20,
    }).start();
  }, [tradeMode, buyLayout, slideAnim, buyOnly]);

  const sliderWidth = tradeMode === 'buy' ? (buyLayout?.width ?? 0) : sellWidth;

  // Transition the slider background from green (buy, translateX 0) to orange
  // (sell, translateX = buy button width) as it slides across.
  const sliderBackgroundColor =
    buyLayout && buyLayout.width > 0
      ? slideAnim.interpolate({
          inputRange: [0, buyLayout.width],
          outputRange: [colors.success.default, brandColor.orange400],
        })
      : colors.success.default;

  if (buyOnly) {
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="border border-muted rounded-xl p-1"
        testID={testID}
      >
        <Box
          twClassName="rounded-lg px-4 py-1"
          style={{ backgroundColor: colors.success.default }}
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
          <Animated.View
            style={[
              styles.slider,
              {
                left: buyLayout.x,
                width: sliderWidth,
                backgroundColor: sliderBackgroundColor,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          />
        )}

        <TouchableOpacity
          onPress={() => handlePress('buy')}
          onLayout={(e) => setBuyLayout(e.nativeEvent.layout)}
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
          onLayout={(e) => setSellWidth(e.nativeEvent.layout.width)}
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
