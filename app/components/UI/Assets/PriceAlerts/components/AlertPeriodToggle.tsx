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
import {
  ALERT_PERIODS,
  AlertPeriod,
  CreatePriceAlertTestIds,
} from '../constants';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  slider: {
    position: 'absolute',
    borderRadius: 999,
  },
});

interface AlertPeriodToggleProps {
  value: AlertPeriod;
  onChange: (value: AlertPeriod) => void;
  /** Locks the toggle — period is immutable once an alert exists (edit mode). */
  isDisabled?: boolean;
}

const periodTestId = (period: AlertPeriod) =>
  period === '24h'
    ? CreatePriceAlertTestIds.PERIOD_SEGMENT_24H
    : CreatePriceAlertTestIds.PERIOD_SEGMENT_1H;

/**
 * Small animated sliding-pill toggle for the percent-change rolling window
 * (24hr / 1hr). Same spring-animation technique as {@link AlertTypeToggle},
 * scaled down since this is a secondary control.
 */
const AlertPeriodToggle: React.FC<AlertPeriodToggleProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [firstLayout, setFirstLayout] = useState<LayoutRectangle | null>(null);
  const [secondWidth, setSecondWidth] = useState(0);

  const [firstPeriod, secondPeriod] = ALERT_PERIODS;

  const handlePress = (next: AlertPeriod) => {
    if (isDisabled) return;
    if (value !== next) {
      playSelection();
      onChange(next);
    }
  };

  useEffect(() => {
    if (!firstLayout) return;
    Animated.spring(slideAnim, {
      toValue: value === firstPeriod ? 0 : firstLayout.width,
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start();
  }, [value, firstLayout, firstPeriod, slideAnim]);

  const sliderWidth =
    value === firstPeriod ? (firstLayout?.width ?? 0) : secondWidth;

  return (
    <Box
      testID={CreatePriceAlertTestIds.PERIOD_SEGMENT}
      flexDirection={BoxFlexDirection.Row}
      twClassName="border border-muted rounded-full p-1 self-center"
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
              backgroundColor: colors.background.defaultPressed,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}

      <TouchableOpacity
        onPress={() => handlePress(firstPeriod)}
        onLayout={(e) => setFirstLayout(e.nativeEvent.layout)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{
          selected: value === firstPeriod,
          disabled: isDisabled,
        }}
        testID={periodTestId(firstPeriod)}
      >
        <Box twClassName="rounded-full px-3 py-0.5 items-center">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings(`price_alerts.period_${firstPeriod}`)}
          </Text>
        </Box>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress(secondPeriod)}
        onLayout={(e) => setSecondWidth(e.nativeEvent.layout.width)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{
          selected: value === secondPeriod,
          disabled: isDisabled,
        }}
        testID={periodTestId(secondPeriod)}
      >
        <Box twClassName="rounded-full px-3 py-0.5 items-center">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings(`price_alerts.period_${secondPeriod}`)}
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default AlertPeriodToggle;
