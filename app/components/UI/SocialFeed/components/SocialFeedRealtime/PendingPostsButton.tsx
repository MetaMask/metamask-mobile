import {
  ButtonBase,
  ButtonBaseSize,
  FontFamily,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
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

export interface PendingPostsButtonProps {
  onPress: () => void;
  pendingNewCount: number;
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
 * Floating "N new posts" pill; springs in when posts arrive and out when
 * revealed.
 */
const PendingPostsButton = ({
  onPress,
  pendingNewCount,
}: PendingPostsButtonProps) => {
  if (pendingNewCount <= 0) {
    return null;
  }

  const label = getPendingPostsLabel(pendingNewCount);

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
      >
        <ButtonBase
          accessibilityLabel={label}
          size={ButtonBaseSize.Sm}
          onPress={handlePress}
          twClassName="bg-background-elevated1 shadow-lg"
        >
          <AnimatedBalanceText
            accessible={false}
            color={TextColor.SuccessDefault}
            fontFamily={FontFamily.Default}
            isLoading={false}
            loadingValue={label}
            value={label}
            variant={TextVariant.BodySm}
          />
        </ButtonBase>
      </Animated.View>
    </Animated.View>
  );
};

export default PendingPostsButton;
