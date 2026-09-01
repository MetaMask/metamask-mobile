import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  type LayoutRectangle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { playSelection } from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';
import type { FeedAudience } from '../types';
import {
  FeedViewSelectorsIDs,
  getFeedAudienceOptionTestId,
} from '../FeedView.testIds';

const SPRING_CONFIG = {
  duration: 150,
  dampingRatio: 0.75,
} as const;

/**
 * Extra horizontal padding vs. the previous `px-4` so Android has room for
 * the full "Following" / "All" glyphs. Do not shrink the font to fit.
 */
const SEGMENT_TW_CLASS = 'rounded-xl px-6 h-8 items-center justify-center';

const AUDIENCE_LABEL_KEYS: Record<FeedAudience, string> = {
  following: 'social_leaderboard.feed.following',
  all: 'social_leaderboard.feed.all',
};

/** Left-to-right segment order. Both options are always rendered. */
export type FeedAudienceOrder = readonly [FeedAudience, FeedAudience];

export const DEFAULT_FEED_AUDIENCE_ORDER: FeedAudienceOrder = [
  'following',
  'all',
];

const styles = StyleSheet.create({
  row: {
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  labelWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  container: {
    flexShrink: 0,
  },
  touchable: {
    overflow: 'visible',
    flexShrink: 0,
  },
  labelActive: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export interface FeedAudienceToggleProps {
  value: FeedAudience;
  onChange: (value: FeedAudience) => void;
  /**
   * Left-to-right segment order. Defaults to Following then All; the feed passes
   * the preselected audience first so the active segment is the leftmost one.
   * Treated as fixed for the lifetime of the toggle — the slide math reads the
   * first segment's measured width, so reordering mid-life would animate from a
   * stale offset.
   */
  order?: FeedAudienceOrder;
  testID?: string;
}

/**
 * Following / All segmented toggle with an animated sliding pill, modeled on
 * the QuickBuy Buy/Sell toggle. Fires a selection haptic on change.
 *
 * The active (white) label cross-fades in on the same `slideProgress` spring as
 * the pill, so the colour tracks the slide rather than snapping. The scope
 * change is dispatched in a transition so the toggle paints before the feed
 * re-renders.
 *
 * `slideProgress` runs 0 -> 1 from the first to the second segment in `order`,
 * so all the animation math is expressed in positional (first/second) terms
 * rather than in audience names.
 */
const FeedAudienceToggle: React.FC<FeedAudienceToggleProps> = ({
  value,
  onChange,
  order = DEFAULT_FEED_AUDIENCE_ORDER,
  testID = FeedViewSelectorsIDs.AUDIENCE_TOGGLE,
}) => {
  const { colors } = useTheme();
  const [firstOption, secondOption] = order;

  const slideProgress = useSharedValue(value === secondOption ? 1 : 0);
  const firstWidthSV = useSharedValue(0);
  const firstXSV = useSharedValue(0);
  const secondWidthSV = useSharedValue(0);

  const prevValueRef = useRef<FeedAudience | null>(null);
  const [displayValue, setDisplayValue] = useState(value);
  const [firstLayout, setFirstLayout] = useState<LayoutRectangle | null>(null);
  const [secondWidth, setSecondWidth] = useState(0);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const animateSlideTo = useCallback(
    (next: FeedAudience) => {
      if (!firstLayout) {
        return;
      }
      const target = next === firstOption ? 0 : 1;
      prevValueRef.current = next;
      slideProgress.value = withSpring(target, SPRING_CONFIG);
    },
    [firstLayout, firstOption, slideProgress],
  );

  const handlePress = (next: FeedAudience) => {
    if (displayValue === next) {
      return;
    }

    playSelection().catch(() => undefined);
    // Flip the label color + slide the pill immediately so the
    // toggle feels responsive.
    setDisplayValue(next);
    animateSlideTo(next);
    // The scope change triggers an expensive feed re-render (new
    // query + skeleton). Marking it a transition lets React commit the urgent
    // toggle paint first instead of batching it behind the heavy work.
    startTransition(() => {
      onChange(next);
    });
  };

  useEffect(() => {
    if (!firstLayout) {
      return;
    }
    const target = value === firstOption ? 0 : 1;

    if (prevValueRef.current === null) {
      slideProgress.value = target;
      prevValueRef.current = value;
      return;
    }

    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      slideProgress.value = withSpring(target, SPRING_CONFIG);
    }
  }, [value, firstLayout, firstOption, slideProgress]);

  const sliderStyle = useAnimatedStyle(() => ({
    left: firstXSV.value,
    width: interpolate(
      slideProgress.value,
      [0, 1],
      [firstWidthSV.value, secondWidthSV.value],
    ),
    transform: [{ translateX: slideProgress.value * firstWidthSV.value }],
  }));

  // Cross-fade the active (white) label in sync with the pill: driven by the
  // same spring, so the colour transition tracks the slide instead of snapping.
  const firstActiveStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, 1 - slideProgress.value)),
  }));
  const secondActiveStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, slideProgress.value)),
  }));

  // Fade the base (inactive) label out as the active label fades in so the
  // selected tab shows a single label. Leaving the base at full opacity under
  // the active overlay double-renders the text (different weight + colour),
  // which reads as a faint drop shadow / ghosting on the selected side.
  const firstBaseStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, slideProgress.value)),
  }));
  const secondBaseStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, 1 - slideProgress.value)),
  }));

  const sliderWidth =
    displayValue === firstOption ? (firstLayout?.width ?? 0) : secondWidth;

  // Plain render helper (not a component) so both segments keep sharing the
  // hook-created animated styles above.
  const renderSegment = (
    option: FeedAudience,
    isFirst: boolean,
    activeStyle: ReturnType<typeof useAnimatedStyle>,
    baseStyle: ReturnType<typeof useAnimatedStyle>,
  ) => (
    <TouchableOpacity
      key={option}
      onPress={() => handlePress(option)}
      onLayout={(e) => {
        const layout = e.nativeEvent.layout;
        if (isFirst) {
          setFirstLayout(layout);
          firstWidthSV.value = layout.width;
          firstXSV.value = layout.x;
          return;
        }
        setSecondWidth(layout.width);
        secondWidthSV.value = layout.width;
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: displayValue === option }}
      testID={getFeedAudienceOptionTestId(option)}
      style={styles.touchable}
    >
      <Box twClassName={SEGMENT_TW_CLASS}>
        <Box style={styles.labelWrap}>
          {/* In-flow Medium label sets the segment width so the wider
              selected weight never clips (e.g. Android "Followin[g]"). */}
          <Animated.View style={activeStyle}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {strings(AUDIENCE_LABEL_KEYS[option])}
            </Text>
          </Animated.View>
          <Animated.View
            style={[styles.labelActive, baseStyle]}
            pointerEvents="none"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
            >
              {strings(AUDIENCE_LABEL_KEYS[option])}
            </Text>
          </Animated.View>
        </Box>
      </Box>
    </TouchableOpacity>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="shrink-0 border border-muted rounded-2xl p-1"
      style={styles.container}
      testID={testID}
    >
      <Box flexDirection={BoxFlexDirection.Row} style={styles.row}>
        {firstLayout && sliderWidth > 0 && (
          <Animated.View
            style={[
              styles.slider,
              sliderStyle,
              { backgroundColor: colors.background.muted },
            ]}
          />
        )}

        {renderSegment(firstOption, true, firstActiveStyle, firstBaseStyle)}
        {renderSegment(secondOption, false, secondActiveStyle, secondBaseStyle)}
      </Box>
    </Box>
  );
};

export default FeedAudienceToggle;
