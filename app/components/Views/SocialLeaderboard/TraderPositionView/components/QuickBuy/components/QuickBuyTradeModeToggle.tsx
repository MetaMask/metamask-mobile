import React, { useRef, useEffect, useState } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
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

const TOGGLE_PADDING = 4;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    top: TOGGLE_PADDING,
    bottom: TOGGLE_PADDING,
    left: TOGGLE_PADDING,
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
  const [buyWidth, setBuyWidth] = useState(0);
  const [sellWidth, setSellWidth] = useState(0);

  const handlePress = (mode: QuickBuyTradeMode) => {
    if (tradeMode !== mode) {
      playSelection();
      setTradeMode(mode);
    }
  };

  // buyWidth is the translateX offset for the sell position regardless of active mode.
  // sellWidth is only used for the slider pill width when sell is active.
  useEffect(() => {
    if (buyWidth === 0) return;
    Animated.spring(slideAnim, {
      toValue: tradeMode === 'buy' ? 0 : buyWidth,
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start();
  }, [tradeMode, buyWidth, slideAnim]);

  const sliderWidth = tradeMode === 'buy' ? buyWidth : sellWidth;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="border border-muted rounded-xl p-1"
      testID={testID}
      style={styles.container}
    >
      {sliderWidth > 0 && (
        <Animated.View
          style={[
            styles.slider,
            {
              width: sliderWidth,
              backgroundColor: colors.background.muted,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}

      <TouchableOpacity
        onPress={() => handlePress('buy')}
        onLayout={(e) => setBuyWidth(e.nativeEvent.layout.width)}
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
