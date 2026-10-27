import { Box, SectionDivider } from '@metamask/design-system-react-native';
import React from 'react';
import {
  useSocialFeedEntranceEventId,
  type SocialFeedEntrances,
} from '../data/socialFeedEntrances';
import type { SocialV1FeedPost } from '../types';
import FeedItemEntryAnimation from './FeedItemEntryAnimation';
import SocialFeedPostShell, {
  type SocialFeedPostShellProps,
} from './SocialFeedPostShell';

export interface SocialFeedRowProps {
  post: SocialV1FeedPost;
  /**
   * Set on every row but the last, which has no divider below it. The divider
   * sits under the post so a post inserted at the top brings its own, and the
   * rows already on screen keep their height.
   */
  dividerTestID?: string;
  /** Realtime entrances; rows without one never animate. */
  entrances?: SocialFeedEntrances;
  scheduleEntryDelay?: (eventId: string) => number;
  reducedMotion?: boolean;
  onAuthorPress?: (post: SocialV1FeedPost) => void;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  onPositionPress?: (post: SocialV1FeedPost) => void;
  /** Clock for relative timestamps; a new value re-renders the row. */
  now?: number;
}

const areReactionsEqual = (
  previous: SocialV1FeedPost['reactions'],
  next: SocialV1FeedPost['reactions'],
): boolean =>
  previous.length === next.length &&
  previous.every(
    (reaction, index) =>
      reaction.emotion === next[index]?.emotion &&
      reaction.count === next[index]?.count,
  );

/**
 * Posts are rebuilt whenever the feed's clock moves, so rows compare what
 * they render instead of the post's identity.
 */
export const areSocialFeedRowPropsEqual = (
  previous: SocialFeedRowProps,
  next: SocialFeedRowProps,
): boolean =>
  previous.dividerTestID === next.dividerTestID &&
  previous.entrances === next.entrances &&
  previous.scheduleEntryDelay === next.scheduleEntryDelay &&
  previous.reducedMotion === next.reducedMotion &&
  previous.onAuthorPress === next.onAuthorPress &&
  previous.onCopyTrade === next.onCopyTrade &&
  previous.onPositionPress === next.onPositionPress &&
  previous.now === next.now &&
  previous.post.id === next.post.id &&
  previous.post.realtimeEventId === next.post.realtimeEventId &&
  previous.post.authorHandle === next.post.authorHandle &&
  previous.post.authorImageUrl === next.post.authorImageUrl &&
  previous.post.timestampMs === next.post.timestampMs &&
  previous.post.commentId === next.post.commentId &&
  previous.post.copyCount === next.post.copyCount &&
  previous.post.gifUri === next.post.gifUri &&
  previous.post.userReaction === next.post.userReaction &&
  areReactionsEqual(previous.post.reactions, next.post.reactions) &&
  previous.post.item === next.post.item &&
  previous.post.marketCapUsd === next.post.marketCapUsd &&
  previous.post.position === next.post.position;

const NO_ENTRANCES: SocialFeedEntrances = {
  hasPlayed: () => true,
  subscribe: () => () => undefined,
  markPlayed: () => undefined,
  retain: () => undefined,
};

/** One post of a virtualized feed, with its divider and realtime entrance. */
const SocialFeedRow: React.FC<SocialFeedRowProps> = ({
  post,
  dividerTestID,
  entrances = NO_ENTRANCES,
  scheduleEntryDelay,
  reducedMotion,
  onAuthorPress,
  onCopyTrade,
  onPositionPress,
  now,
}) => {
  const eventId = useSocialFeedEntranceEventId(entrances, post.realtimeEventId);
  return (
    <FeedItemEntryAnimation
      eventId={eventId}
      scheduleEntryDelay={scheduleEntryDelay}
      onAnimationComplete={entrances.markPlayed}
      reducedMotion={reducedMotion}
    >
      <Box twClassName="px-4">
        <SocialFeedPostShell
          post={post}
          onAuthorPress={onAuthorPress}
          onCopyTrade={onCopyTrade}
          onPositionPress={post.position ? onPositionPress : undefined}
          now={now}
        />
      </Box>
      {dividerTestID ? (
        <SectionDivider marginVertical={1} testID={dividerTestID} />
      ) : null}
    </FeedItemEntryAnimation>
  );
};

export default React.memo(SocialFeedRow, areSocialFeedRowPropsEqual);
