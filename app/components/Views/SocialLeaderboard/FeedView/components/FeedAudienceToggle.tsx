import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useEffect, useRef, useState } from 'react';
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
});

export interface FeedAudienceToggleProps {
  value: FeedAudience;
  onChange: (value: FeedAudience) => void;
  testID?: string;
}

/**
 * Following / All segmented toggle with an animated sliding pill, modeled on
 * the QuickBuy Buy/Sell toggle. Fires a selection haptic on change.
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
  const [followingLayout, setFollowingLayout] =
    useState<LayoutRectangle | null>(null);
  const [allWidth, setAllWidth] = useState(0);

  const handlePress = (next: FeedAudience) => {
    if (value !== next) {
      playSelection().catch(() => undefined);
      onChange(next);
    }
  };

  useEffect(() => {
    if (!followingLayout) return;
    const target = value === 'following' ? 0 : 1;

    if (prevValueRef.current === null) {
      slideProgress.value = target;
      prevValueRef.current = value;
      return;
    }

    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      slideProgress.value = withSpring(target, {
        duration: 150,
        dampingRatio: 0.75,
      });
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

  const sliderWidth =
    value === 'following' ? (followingLayout?.width ?? 0) : allWidth;

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
          accessibilityState={{ selected: value === 'following' }}
          testID={getFeedAudienceOptionTestId('following')}
        >
          <Box twClassName="rounded-xl px-4 py-2">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={
                value === 'following' ? FontWeight.Medium : FontWeight.Regular
              }
              color={
                value === 'following'
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
            >
              {strings('social_leaderboard.feed.following')}
            </Text>
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
          accessibilityState={{ selected: value === 'all' }}
          testID={getFeedAudienceOptionTestId('all')}
        >
          <Box twClassName="rounded-xl px-4 py-2">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={
                value === 'all' ? FontWeight.Medium : FontWeight.Regular
              }
              color={
                value === 'all'
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
            >
              {strings('social_leaderboard.feed.all')}
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default FeedAudienceToggle;
