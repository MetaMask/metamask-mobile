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

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    borderRadius: 10,
  },
});

interface QuickBuyTradeModeToggleProps {
  testID?: string;
}

const QuickBuyTradeModeToggle: React.FC<QuickBuyTradeModeToggleProps> = ({
  testID = 'quick-buy-trade-mode-toggle',
}) => {
  const { tradeMode, setTradeMode, hasSellableBalance } = useQuickBuyContext();
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [buyLayout, setBuyLayout] = useState<LayoutRectangle | null>(null);
  const [sellWidth, setSellWidth] = useState(0);

  const handlePress = (mode: QuickBuyTradeMode) => {
    if (tradeMode !== mode) {
      playSelection();
      setTradeMode(mode);
    }
  };

  useEffect(() => {
    if (!buyLayout) return;
    Animated.spring(slideAnim, {
      toValue: tradeMode === 'buy' ? 0 : buyLayout.width,
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start();
  }, [tradeMode, buyLayout, slideAnim]);

  const sliderWidth = tradeMode === 'buy' ? (buyLayout?.width ?? 0) : sellWidth;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="border border-muted rounded-xl p-1"
      testID={testID}
      style={styles.container}
    >
      {buyLayout && sliderWidth > 0 && (
        <Animated.View
          style={[
            styles.slider,
            {
              left: buyLayout.x,
              top: buyLayout.y,
              height: buyLayout.height,
              width: sliderWidth,
              backgroundColor: colors.background.muted,
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
        <Box twClassName="rounded-[10px] px-3 py-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={
              tradeMode === 'buy' ? FontWeight.Medium : FontWeight.Regular
            }
            color={TextColor.TextDefault}
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
          twClassName={`rounded-[10px] px-3 py-1 ${!hasSellableBalance ? 'opacity-40' : ''}`}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={
              tradeMode === 'sell' ? FontWeight.Medium : FontWeight.Regular
            }
            color={TextColor.TextDefault}
          >
            {strings('social_leaderboard.quick_buy.sell_label')}
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default QuickBuyTradeModeToggle;
