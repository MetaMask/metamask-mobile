import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  ButtonBaseSize,
  FontFamily,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { AnimatedBalanceText } from '../../../../../component-library/components-temp/AnimatedNumericText';
import { playSelection } from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';
import { SOCIAL_FEED_REALTIME_BUFFER_SIZE } from '../../data/socialFeedRealtime';

const PENDING_POSTS_ZOOM_IN = ZoomIn.springify()
  .damping(14)
  .stiffness(560)
  .mass(0.4);
const PENDING_POSTS_ZOOM_OUT = ZoomOut.springify()
  .damping(14)
  .stiffness(560)
  .mass(0.4);
const PENDING_POSTS_FADE_IN = FadeIn.springify()
  .damping(14)
  .stiffness(560)
  .mass(0.4);
const PENDING_POSTS_FADE_OUT = FadeOut.springify()
  .damping(14)
  .stiffness(560)
  .mass(0.4);

const LABEL_TEXT_PROPS = {
  color: TextColor.SuccessDefault,
  fontFamily: FontFamily.Default,
  fontWeight: FontWeight.Bold,
  variant: TextVariant.BodySm,
} as const;

export const PENDING_POSTS_SLOTS_PROBE_TEST_ID =
  'pending-posts-button-slots-probe';

export interface PendingPostsButtonProps {
  onPress: () => void;
  pendingNewCount: number;
}

export interface PendingPostsLabelParts {
  label: string;
  leading: string;
  count: string;
  trailing: string;
}

export const getPendingPostsLabel = (pendingNewCount: number): string =>
  pendingNewCount >= SOCIAL_FEED_REALTIME_BUFFER_SIZE
    ? strings('social_leaderboard.feed.live_stream.new_posts_capped', {
        count: SOCIAL_FEED_REALTIME_BUFFER_SIZE,
      })
    : strings('social_leaderboard.feed.live_stream.new_posts', {
        count: pendingNewCount,
      });

/**
 * Splits the localized label around its count so translations keep their
 * word order while only the number rolls.
 */
export const getPendingPostsLabelParts = (
  pendingNewCount: number,
): PendingPostsLabelParts => {
  const label = getPendingPostsLabel(pendingNewCount);
  const count = String(
    Math.min(pendingNewCount, SOCIAL_FEED_REALTIME_BUFFER_SIZE),
  );
  const countIndex = label.indexOf(count);

  if (countIndex < 0) {
    return { label, leading: label, count: '', trailing: '' };
  }

  return {
    label,
    leading: label.slice(0, countIndex),
    count,
    trailing: label.slice(countIndex + count.length),
  };
};

/**
 * Laminar sizes the reel to the proportional digits but draws every slot as
 * wide as `0`, so the reel overflows onto the words beside it. A zero-height
 * all-zero probe in the same column widens the box to the drawn slots; it must
 * stay in flow because an absolute child is capped at the parent's width.
 */
const PendingPostsCount = ({ count }: { count: string }) => (
  <Box>
    <Text
      {...LABEL_TEXT_PROPS}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      numberOfLines={1}
      testID={PENDING_POSTS_SLOTS_PROBE_TEST_ID}
      twClassName="h-0 opacity-0"
    >
      {count.replace(/\d/gu, '0')}
    </Text>
    <AnimatedBalanceText
      accessible={false}
      color={LABEL_TEXT_PROPS.color}
      fontFamily={LABEL_TEXT_PROPS.fontFamily}
      isLoading={false}
      loadingValue={count}
      value={count}
      variant={LABEL_TEXT_PROPS.variant}
    />
  </Box>
);

/**
 * Floating "N new posts" pill; springs in when posts arrive and out when
 * revealed.
 */
const PendingPostsButton = ({
  onPress,
  pendingNewCount,
}: PendingPostsButtonProps) => {
  const tw = useTailwind();
  const { shadows } = useTheme();
  if (pendingNewCount <= 0) {
    return null;
  }

  const { label, leading, count, trailing } =
    getPendingPostsLabelParts(pendingNewCount);
  const leadingText = leading.trim();
  const trailingText = trailing.trim();

  const handlePress = () => {
    playSelection().catch(() => undefined);
    onPress();
  };

  return (
    <Animated.View
      entering={PENDING_POSTS_FADE_IN}
      exiting={PENDING_POSTS_FADE_OUT}
    >
      <Animated.View
        entering={PENDING_POSTS_ZOOM_IN}
        exiting={PENDING_POSTS_ZOOM_OUT}
        // ButtonBase clips its own shadow; Android draws elevation only under a background.
        style={[
          tw.style('rounded-full bg-background-section'),
          shadows.size.sm,
        ]}
      >
        <ButtonBase
          accessibilityLabel={label}
          size={ButtonBaseSize.Sm}
          onPress={handlePress}
          twClassName={(pressed) =>
            `border border-muted ${
              pressed
                ? 'bg-background-section-pressed'
                : 'bg-background-section'
            }`
          }
        >
          <Box
            alignItems={BoxAlignItems.Center}
            flexDirection={BoxFlexDirection.Row}
          >
            {leadingText ? (
              <Text
                {...LABEL_TEXT_PROPS}
                accessible={false}
                twClassName={/\s$/u.test(leading) ? 'mr-1' : undefined}
              >
                {leadingText}
              </Text>
            ) : null}
            {count ? <PendingPostsCount count={count} /> : null}
            {trailingText ? (
              <Text
                {...LABEL_TEXT_PROPS}
                accessible={false}
                twClassName={/^\s/u.test(trailing) ? 'ml-1' : undefined}
              >
                {trailingText}
              </Text>
            ) : null}
          </Box>
        </ButtonBase>
      </Animated.View>
    </Animated.View>
  );
};

export default PendingPostsButton;
