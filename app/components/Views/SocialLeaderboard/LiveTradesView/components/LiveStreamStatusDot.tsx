import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, LIGHT_MODE_SUCCESS_GREEN } from '../../../../../util/theme';
import { LiveTradesViewSelectorsIDs } from '../LiveTradesView.testIds';

const LIVE_PULSE_HALF_MS = 900;
const LIVE_PULSE_MIN_OPACITY = 0.45;

export interface LiveStreamStatusDotProps {
  isLive: boolean;
  /**
   * Selected FilterButton uses a light pill; Paused dot must match button label
   * (`colors.primary.inverse`), not default text (often light in dark mode).
   */
  onPrimaryButton?: boolean;
}

/**
 * Status glyph beside the Live / Paused stream toggle. Live uses a green dot
 * with a subtle opacity pulse; Paused uses a solid dark dot.
 */
const LiveStreamStatusDot: React.FC<LiveStreamStatusDotProps> = ({
  isLive,
  onPrimaryButton = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(pulseOpacity);
    if (!isLive || prefersReducedMotion) {
      pulseOpacity.value = 1;
      return;
    }
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(LIVE_PULSE_MIN_OPACITY, { duration: LIVE_PULSE_HALF_MS }),
        withTiming(1, { duration: LIVE_PULSE_HALF_MS }),
      ),
      -1,
      false,
    );
  }, [isLive, prefersReducedMotion, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const dotColor = isLive
    ? LIGHT_MODE_SUCCESS_GREEN
    : onPrimaryButton
      ? colors.primary.inverse
      : colors.text.default;

  return (
    <Box testID={LiveTradesViewSelectorsIDs.STREAM_STATUS_DOT}>
      <Animated.View
        style={[
          tw.style('h-2 w-2 rounded-full'),
          { backgroundColor: dotColor },
          isLive && !prefersReducedMotion ? pulseStyle : undefined,
        ]}
      />
    </Box>
  );
};

export default LiveStreamStatusDot;
