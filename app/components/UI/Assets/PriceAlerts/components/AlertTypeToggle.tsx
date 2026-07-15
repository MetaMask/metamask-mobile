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
import { AlertType, CreatePriceAlertTestIds } from '../constants';

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
  value: AlertType;
  onChange: (value: AlertType) => void;
  /** Locks the toggle — type is immutable once an alert exists (edit mode). */
  isDisabled?: boolean;
}

/**
 * Animated sliding-pill toggle for price alert type selection.
 * Uses the same spring-animation technique as QuickBuyTradeModeToggle.
 */
const AlertTypeToggle: React.FC<AlertTypeToggleProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [firstLayout, setFirstLayout] = useState<LayoutRectangle | null>(null);
  const [secondWidth, setSecondWidth] = useState(0);

  const handlePress = (next: AlertType) => {
    if (isDisabled) return;
    if (value !== next) {
      playSelection();
      onChange(next);
    }
  };

  useEffect(() => {
    if (!firstLayout) return;
    Animated.spring(slideAnim, {
      toValue: value === 'absolute_price' ? 0 : firstLayout.width,
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start();
  }, [value, firstLayout, slideAnim]);

  const sliderWidth =
    value === 'absolute_price' ? (firstLayout?.width ?? 0) : secondWidth;

  return (
    <Box
      testID={CreatePriceAlertTestIds.TYPE_SEGMENT}
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
        onPress={() => handlePress('absolute_price')}
        onLayout={(e) => setFirstLayout(e.nativeEvent.layout)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{
          selected: value === 'absolute_price',
          disabled: isDisabled,
        }}
        testID={CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET}
        style={styles.pill}
      >
        <Box twClassName="rounded-[10px] px-3 py-2 items-center">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={
              value === 'absolute_price'
                ? FontWeight.Medium
                : FontWeight.Regular
            }
            color={TextColor.TextDefault}
          >
            {strings('price_alerts.price_target')}
          </Text>
        </Box>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress('percent_change')}
        onLayout={(e) => setSecondWidth(e.nativeEvent.layout.width)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{
          selected: value === 'percent_change',
          disabled: isDisabled,
        }}
        testID={CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE}
        style={styles.pill}
      >
        <Box twClassName="rounded-[10px] px-3 py-2 items-center">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={
              value === 'percent_change'
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
