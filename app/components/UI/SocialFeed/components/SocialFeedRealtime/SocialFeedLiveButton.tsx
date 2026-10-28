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
import { SocialFeedRealtimeSelectorsIDs } from './SocialFeedRealtime.testIds';
import { useSocialFeedRealtime } from './SocialFeedRealtimeContext';

const PAUSED_COLOR_PROPS = { twClassName: TextColor.TextMuted };

export interface SocialFeedLiveButtonProps {
  /**
   * Receives the next value; the host stores it and passes it back to
   * `SocialFeed` as `paused`. Resuming reveals the held posts.
   */
  onPausedChange: (paused: boolean) => void;
}

/**
 * Live / Paused toggle for a virtualized `SocialFeed` header. Renders nothing
 * outside one.
 */
const SocialFeedLiveButton: React.FC<SocialFeedLiveButtonProps> = ({
  onPausedChange,
}) => {
  const realtime = useSocialFeedRealtime();
  if (!realtime) {
    return null;
  }
  const { paused, pendingNewCount } = realtime;
  const label = strings(
    paused
      ? 'social_leaderboard.feed.live_stream.paused'
      : 'social_leaderboard.feed.live_stream.live',
  );

  const handlePress = () => {
    if (paused && pendingNewCount > 0) {
      // Resuming with held posts reloads the feed, like a pull-to-refresh commit.
      playImpact(ImpactMoment.PullToRefresh).catch(() => undefined);
    } else {
      playSelection().catch(() => undefined);
    }
    onPausedChange(!paused);
  };

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Sm}
      onPress={handlePress}
      testID={SocialFeedRealtimeSelectorsIDs.LIVE_BUTTON}
      accessibilityLabel={label}
      textProps={paused ? PAUSED_COLOR_PROPS : undefined}
      startIconName={paused ? IconName.Pause : IconName.Play}
      startIconProps={paused ? PAUSED_COLOR_PROPS : undefined}
    >
      {label}
    </Button>
  );
};

export default SocialFeedLiveButton;
