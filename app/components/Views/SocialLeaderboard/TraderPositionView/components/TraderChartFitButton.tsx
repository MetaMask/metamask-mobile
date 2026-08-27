import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';

/** Spring the button scale settles back on with after a press (tactile feedback). */
const PRESS_SPRING = { damping: 14, stiffness: 420, mass: 0.6 } as const;

export interface TraderChartFitButtonProps {
  /** Fired when tapped — resets the chart zoom/pan to its default fit range. */
  onPress: () => void;
  testID?: string;
}

/**
 * Square "fit" button that sits at the right end of the timeframe pill row and
 * resets the position chart's zoom/pan back to its default framing (wrap first→
 * latest trade, and — for open positions — extend to now). The four-corner
 * bracket (ScanFocus) icon reads as "fit to frame".
 *
 * Reanimated drives a spring on the button's scale for press feedback: pressing
 * dips the scale, releasing springs it back via {@link withSpring}. The range
 * reset itself is handed to the chart's imperative focus (TradingView's own
 * viewport animation across the WebView bridge) — the spring here animates only
 * the button, not the chart viewport.
 */
const TraderChartFitButton: React.FC<TraderChartFitButtonProps> = ({
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const pressScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(0.88, { duration: 90 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, PRESS_SPRING);
  }, [pressScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={strings(
        'social_leaderboard.trader_position.reset_chart_zoom_accessibility_label',
      )}
      testID={testID}
    >
      <Animated.View
        style={[
          tw.style('h-8 w-8 items-center justify-center rounded'),
          animatedStyle,
        ]}
      >
        <Icon
          name={IconName.ScanFocus}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Animated.View>
    </Pressable>
  );
};

export default TraderChartFitButton;
