import { Box, TextColor } from '@metamask/design-system-react-native';
import React from 'react';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../../util/haptics';
import LiveButton from './LiveButton';
import PendingPostsButton from './PendingPostsButton';
import { useSocialFeedRealtime } from './SocialFeedRealtimeContext';

export interface SocialFeedRealtimeControlsProps {
  /**
   * Shows the Live / Paused toggle; the host stores the value and passes it
   * back to `SocialFeed` as `paused`. Without it only the new-posts pill shows.
   */
  onPausedChange?: (paused: boolean) => void;
  twClassName?: string;
}

/**
 * Stream controls for a virtualized `SocialFeed` header. Reads the feed's
 * realtime state, so it renders nothing outside one, and nothing at all while
 * there is no toggle and no post waiting.
 */
const SocialFeedRealtimeControls: React.FC<SocialFeedRealtimeControlsProps> = ({
  onPausedChange,
  twClassName,
}) => {
  const realtime = useSocialFeedRealtime();
  if (!realtime) {
    return null;
  }
  const { paused, pendingNewCount, revealPending } = realtime;
  if (!onPausedChange && pendingNewCount <= 0) {
    return null;
  }

  const handleLivePress = () => {
    if (paused && pendingNewCount > 0) {
      // Resuming with held posts reloads the feed, like a pull-to-refresh commit.
      playImpact(ImpactMoment.PullToRefresh).catch(() => undefined);
    } else {
      playSelection().catch(() => undefined);
    }
    if (paused) {
      revealPending();
    }
    onPausedChange?.(!paused);
  };

  const handlePendingPostsPress = () => {
    if (onPausedChange) {
      playSelection().catch(() => undefined);
    }
    revealPending();
  };

  return (
    <Box
      twClassName={`flex-row items-center gap-2${twClassName ? ` ${twClassName}` : ''}`}
    >
      {onPausedChange ? (
        <LiveButton isLive={!paused} onPress={handleLivePress} />
      ) : null}
      <PendingPostsButton
        pendingNewCount={pendingNewCount}
        onPress={handlePendingPostsPress}
        textColor={TextColor.SuccessDefault}
      />
    </Box>
  );
};

export default SocialFeedRealtimeControls;
