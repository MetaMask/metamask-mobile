import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useContext, useEffect, useState } from 'react';
import Animated, {
  Easing,
  LayoutAnimationConfig,
  withSpring,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  type LayoutAnimation,
} from 'react-native-reanimated';
import { subscribeToTraderStatRotation } from '../utils/traderStatRotationClock';
import { TRADER_STAT_ROTATION_MS } from '../utils/traderStats';
import { TraderStatRotationContext } from './TraderStatRotationContext';

/** Length of the swipe that replaces one stat with the next. */
export const TRADER_STAT_SWIPE_MS = 100;

const SWIPE_TIMING = {
  duration: TRADER_STAT_SWIPE_MS,
  easing: Easing.out(Easing.cubic),
};

/** The incoming stat lands with a small overshoot past its slot. */
const SWIPE_IN_SPRING = { duration: 250, dampingRatio: 0.8 };

const swipeIn = (values: EntryAnimationsValues): LayoutAnimation => {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: values.targetHeight }],
    },
    animations: {
      opacity: withTiming(1, SWIPE_TIMING),
      transform: [{ translateY: withSpring(0, SWIPE_IN_SPRING) }],
    },
  };
};

const swipeOut = (values: ExitAnimationsValues): LayoutAnimation => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: {
      opacity: withTiming(0, SWIPE_TIMING),
      transform: [
        { translateY: withTiming(-values.currentHeight, SWIPE_TIMING) },
      ],
    },
  };
};

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
 * Cycles a trader's stats in a single line: the current stat swipes up and
 * out while the next one swipes up into place.
 *
 * The swipe is an entering/exiting pair on a label keyed by its index, so it
 * runs in the mounting layer instead of committing the shadow tree on every
 * frame. Every rotating stat follows one shared clock, so the whole feed
 * swaps in a single React commit. A single stat never subscribes: there is
 * nothing to rotate to, and neither does one under an inactive
 * `TraderStatRotationContext`.
 */
const RotatingTraderStat: React.FC<RotatingTraderStatProps> = ({
  labels,
  intervalMs = TRADER_STAT_ROTATION_MS,
  testID,
}) => {
  const [index, setIndex] = useState(0);
  const isOnScreen = useContext(TraderStatRotationContext);

  const count = labels.length;
  const shouldRotate = count > 1 && isOnScreen;

  useEffect(() => {
    setIndex((current) => (current < count ? current : 0));
  }, [count]);

  useEffect(() => {
    if (!shouldRotate) {
      return undefined;
    }
    return subscribeToTraderStatRotation(intervalMs, () => {
      setIndex((current) => (current + 1) % count);
    });
  }, [shouldRotate, count, intervalMs]);

  if (count === 0) {
    return null;
  }

  return (
    <Box twClassName="overflow-hidden">
      {/* The first stat appears with its row, and a row leaving the list does
          not wait for its stat to swipe out. */}
      <LayoutAnimationConfig skipEntering skipExiting>
        <Animated.View key={index} entering={swipeIn} exiting={swipeOut}>
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            testID={testID}
          >
            {labels[index] ?? labels[0]}
          </Text>
        </Animated.View>
      </LayoutAnimationConfig>
    </Box>
  );
};

export default RotatingTraderStat;
