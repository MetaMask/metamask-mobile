import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  type LayoutRectangle,
} from 'react-native';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { playSelection } from '../../../../../util/haptics';
import { CreatePriceAlertTestIds, PriceAlertType } from '../constants';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    borderRadius: 10,
  },
  pill: {
    flex: 1,
  },
});

interface AlertTypeToggleProps {
  value: PriceAlertType;
  onChange: (value: PriceAlertType) => void;
}

/**
 * Animated sliding-pill toggle for price alert type selection.
 * Uses the same spring-animation technique as QuickBuyTradeModeToggle.
 */
const AlertTypeToggle: React.FC<AlertTypeToggleProps> = ({
  value,
  onChange,
}) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [firstLayout, setFirstLayout] = useState<LayoutRectangle | null>(null);
  const [secondWidth, setSecondWidth] = useState(0);

  const handlePress = (next: PriceAlertType) => {
    if (value !== next) {
      playSelection();
      onChange(next);
    }
  };

  useEffect(() => {
    if (!firstLayout) return;
    Animated.spring(slideAnim, {
      toValue: value === PriceAlertType.PriceReaches ? 0 : firstLayout.width,
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start();
  }, [value, firstLayout, slideAnim]);

  const sliderWidth =
    value === PriceAlertType.PriceReaches
      ? (firstLayout?.width ?? 0)
      : secondWidth;

  return (
    <Box
      testID={CreatePriceAlertTestIds.ALERT_TYPE_TOGGLE}
      flexDirection={BoxFlexDirection.Row}
      twClassName="mx-4 border border-muted rounded-xl p-1"
      style={styles.container}
    >
      {firstLayout && sliderWidth > 0 && (
        <Animated.View
          style={[
            styles.slider,
            {
              left: firstLayout.x,
              top: firstLayout.y,
              height: firstLayout.height,
              width: sliderWidth,
              backgroundColor: colors.background.muted,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}

      <TouchableOpacity
        onPress={() => handlePress(PriceAlertType.PriceReaches)}
        onLayout={(e) => setFirstLayout(e.nativeEvent.layout)}
        accessibilityRole="button"
        accessibilityState={{ selected: value === PriceAlertType.PriceReaches }}
        testID={CreatePriceAlertTestIds.PRICE_REACHES_TAB}
        style={styles.pill}
      >
        <Box twClassName="rounded-[10px] px-3 py-2 items-center">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={
              value === PriceAlertType.PriceReaches
                ? FontWeight.Medium
                : FontWeight.Regular
            }
            color={TextColor.TextDefault}
          >
            {strings('price_alerts.price_reaches')}
          </Text>
        </Box>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress(PriceAlertType.PriceChange)}
        onLayout={(e) => setSecondWidth(e.nativeEvent.layout.width)}
        accessibilityRole="button"
        accessibilityState={{ selected: value === PriceAlertType.PriceChange }}
        testID={CreatePriceAlertTestIds.PRICE_CHANGE_TAB}
        style={styles.pill}
      >
        <Box twClassName="rounded-[10px] px-3 py-2 items-center">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={
              value === PriceAlertType.PriceChange
                ? FontWeight.Medium
                : FontWeight.Regular
            }
            color={TextColor.TextDefault}
          >
            {strings('price_alerts.price_change')}
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default AlertTypeToggle;
