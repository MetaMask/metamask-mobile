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
  },
  labelActive: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export interface FeedAudienceToggleProps {
  value: FeedAudience;
  onChange: (value: FeedAudience) => void;
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
 */
const FeedAudienceToggle: React.FC<FeedAudienceToggleProps> = ({
  value,
  onChange,
  testID = FeedViewSelectorsIDs.AUDIENCE_TOGGLE,
}) => {
  const { colors } = useTheme();

  const slideProgress = useSharedValue(value === 'all' ? 1 : 0);
  const followingWidthSV = useSharedValue(0);
  const followingXSV = useSharedValue(0);
  const allWidthSV = useSharedValue(0);

  const prevValueRef = useRef<FeedAudience | null>(null);
  const [displayValue, setDisplayValue] = useState(value);
  const [followingLayout, setFollowingLayout] =
    useState<LayoutRectangle | null>(null);
  const [allWidth, setAllWidth] = useState(0);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const animateSlideTo = useCallback(
    (next: FeedAudience) => {
      if (!followingLayout) {
        return;
      }
      const target = next === 'following' ? 0 : 1;
      prevValueRef.current = next;
      slideProgress.value = withSpring(target, SPRING_CONFIG);
    },
    [followingLayout, slideProgress],
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
    if (!followingLayout) {
      return;
    }
    const target = value === 'following' ? 0 : 1;

    if (prevValueRef.current === null) {
      slideProgress.value = target;
      prevValueRef.current = value;
      return;
    }

    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      slideProgress.value = withSpring(target, SPRING_CONFIG);
    }
  }, [value, followingLayout, slideProgress]);

  const sliderStyle = useAnimatedStyle(() => ({
    left: followingXSV.value,
    width: interpolate(
      slideProgress.value,
      [0, 1],
      [followingWidthSV.value, allWidthSV.value],
    ),
    transform: [{ translateX: slideProgress.value * followingWidthSV.value }],
  }));

  // Cross-fade the active (white) label in sync with the pill: driven by the
  // same spring, so the colour transition tracks the slide instead of snapping.
  const followingActiveStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, 1 - slideProgress.value)),
  }));
  const allActiveStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, slideProgress.value)),
  }));

  const sliderWidth =
    displayValue === 'following' ? (followingLayout?.width ?? 0) : allWidth;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="border border-muted rounded-2xl p-1"
      testID={testID}
    >
      <Box flexDirection={BoxFlexDirection.Row} style={styles.row}>
        {followingLayout && sliderWidth > 0 && (
          <Animated.View
            style={[
              styles.slider,
              sliderStyle,
              { backgroundColor: colors.background.muted },
            ]}
          />
        )}

        <TouchableOpacity
          onPress={() => handlePress('following')}
          onLayout={(e) => {
            const layout = e.nativeEvent.layout;
            setFollowingLayout(layout);
            followingWidthSV.value = layout.width;
            followingXSV.value = layout.x;
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: displayValue === 'following' }}
          testID={getFeedAudienceOptionTestId('following')}
        >
          <Box twClassName="rounded-xl px-4 h-8 items-center justify-center">
            <Box style={styles.labelWrap}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Regular}
                color={TextColor.TextAlternative}
              >
                {strings('social_leaderboard.feed.following')}
              </Text>
              <Animated.View
                style={[styles.labelActive, followingActiveStyle]}
                pointerEvents="none"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('social_leaderboard.feed.following')}
                </Text>
              </Animated.View>
            </Box>
          </Box>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handlePress('all')}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            setAllWidth(width);
            allWidthSV.value = width;
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: displayValue === 'all' }}
          testID={getFeedAudienceOptionTestId('all')}
        >
          <Box twClassName="rounded-xl px-4 h-8 items-center justify-center">
            <Box style={styles.labelWrap}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Regular}
                color={TextColor.TextAlternative}
              >
                {strings('social_leaderboard.feed.all')}
              </Text>
              <Animated.View
                style={[styles.labelActive, allActiveStyle]}
                pointerEvents="none"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('social_leaderboard.feed.all')}
                </Text>
              </Animated.View>
            </Box>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default FeedAudienceToggle;
