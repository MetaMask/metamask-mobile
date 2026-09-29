import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useEffect, useRef, useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TRADER_STAT_ROTATION_MS } from '../utils/traderStats';

/** Length of each half of the cross-fade (out, then in). */
export const TRADER_STAT_FADE_MS = 220;

export interface RotatingTraderStatProps {
  /** Ordered stats to cycle through. Empty renders nothing. */
  labels: string[];
  /**
   * Milliseconds each label holds before the next one takes over. Exposed for
   * tests; the header uses the default.
   */
  intervalMs?: number;
  testID?: string;
}

/**
 * Cycles a trader's stats in a single line, cross-fading between them.
 *
 * The visible label is state rather than a derived index so the swap happens
 * at the midpoint of the fade, while the text is invisible -- switching on the
 * interval alone would pop the new string in at full opacity.
 *
 * A single stat never animates and no timer is started: there is nothing to
 * rotate to, and an idle interval per feed row is a cost with no payoff.
 */
const RotatingTraderStat: React.FC<RotatingTraderStatProps> = ({
  labels,
  intervalMs = TRADER_STAT_ROTATION_MS,
  testID,
}) => {
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);
  // The timers outlive any single render, so they are cleared on unmount
  // rather than left to fire against a gone component.
  const fadeInTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = labels.length;
  const shouldRotate = count > 1;

  useEffect(() => {
    setIndex((current) => (current < count ? current : 0));
  }, [count]);

  useEffect(() => {
    if (!shouldRotate) {
      opacity.value = 1;
      return undefined;
    }

    const rotation = setInterval(() => {
      opacity.value = withTiming(0, { duration: TRADER_STAT_FADE_MS });
      fadeInTimer.current = setTimeout(() => {
        setIndex((current) => (current + 1) % count);
        opacity.value = withTiming(1, { duration: TRADER_STAT_FADE_MS });
      }, TRADER_STAT_FADE_MS);
    }, intervalMs);

    return () => {
      clearInterval(rotation);
      if (fadeInTimer.current) {
        clearTimeout(fadeInTimer.current);
        fadeInTimer.current = null;
      }
      opacity.value = 1;
    };
  }, [shouldRotate, count, intervalMs, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (count === 0) {
    return null;
  }

  return (
    <Animated.View style={animatedStyle}>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        testID={testID}
      >
        {labels[index] ?? labels[0]}
      </Text>
    </Animated.View>
  );
};

export default RotatingTraderStat;
