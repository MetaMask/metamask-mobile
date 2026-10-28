import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../../util/haptics';
import { SocialFeedRealtimeControlsSelectorsIDs } from './SocialFeedRealtimeControls.testIds';

const PAUSED_COLOR_PROPS = { twClassName: TextColor.TextMuted };

export interface LiveButtonProps {
  isLive: boolean;
  /** Posts held back while paused; resuming then reloads the feed. */
  hasPendingPosts: boolean;
  onPress: () => void;
}

/** Live / Paused toggle for a realtime feed header. */
const LiveButton: React.FC<LiveButtonProps> = ({
  isLive,
  hasPendingPosts,
  onPress,
}) => {
  const label = strings(
    isLive
      ? 'social_leaderboard.feed.live_stream.live'
      : 'social_leaderboard.feed.live_stream.paused',
  );

  const handlePress = () => {
    if (!isLive && hasPendingPosts) {
      // Resuming with held posts reloads the feed, like a pull-to-refresh commit.
      playImpact(ImpactMoment.PullToRefresh).catch(() => undefined);
    } else {
      playSelection().catch(() => undefined);
    }
    onPress();
  };

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      onPress={handlePress}
      testID={SocialFeedRealtimeControlsSelectorsIDs.STREAM_BUTTON}
      accessibilityLabel={label}
      textProps={isLive ? undefined : PAUSED_COLOR_PROPS}
      startIconName={isLive ? IconName.Play : IconName.Pause}
      startIconProps={isLive ? undefined : PAUSED_COLOR_PROPS}
    >
      {label}
    </Button>
  );
};

export default LiveButton;
