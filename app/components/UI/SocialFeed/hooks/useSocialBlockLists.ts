import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { useLogSocialQueryError } from '../../../../util/social/socialServiceTelemetry';
import {
  BLOCKED_COMMENT_IDS_QUERY_KEY,
  BLOCKED_PROFILE_IDS_QUERY_KEY,
  fetchBlockedCommentIds,
  fetchBlockedProfileIds,
} from '../moderationApi';

export interface SocialBlockLists {
  /** Profile ids of traders the viewer blocked. */
  blockedProfileIds: ReadonlySet<string>;
  /** Ids of comments the viewer reported or hid. */
  blockedCommentIds: ReadonlySet<string>;
}

/** The lists only change when the viewer blocks, which invalidates them. */
const STALE_TIME_MS = 5 * 60 * 1000;

const EMPTY_IDS: string[] = [];

/**
 * The viewer's blocked traders and hidden comments, for filtering feeds and
 * leaderboards on the client. The social API serves shared feeds without
 * per-user filtering, so hiding them is the client's job.
 *
 * Empty while the wallet is locked, and on a failed fetch: nothing is hidden
 * rather than everything.
 */
export const useSocialBlockLists = (): SocialBlockLists => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const queryOptions = {
    enabled: isUnlocked,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  } as const;

  const profiles = useQuery({
    ...queryOptions,
    queryKey: BLOCKED_PROFILE_IDS_QUERY_KEY,
    queryFn: fetchBlockedProfileIds,
  });
  const comments = useQuery({
    ...queryOptions,
    queryKey: BLOCKED_COMMENT_IDS_QUERY_KEY,
    queryFn: fetchBlockedCommentIds,
  });

  useLogSocialQueryError(profiles.error, {
    surface: 'moderation',
    operation: 'fetch_blocked_profiles',
    extraMessage: 'Blocked traders fetch failed',
    source: 'useSocialBlockLists',
    endpoint: 'blocked_profiles',
  });
  useLogSocialQueryError(comments.error, {
    surface: 'moderation',
    operation: 'fetch_blocked_content',
    extraMessage: 'Blocked comments fetch failed',
    source: 'useSocialBlockLists',
    endpoint: 'blocked_content',
  });

  const profileIds = profiles.data ?? EMPTY_IDS;
  const commentIds = comments.data ?? EMPTY_IDS;
  return useMemo(
    () => ({
      blockedProfileIds: new Set(profileIds),
      blockedCommentIds: new Set(commentIds),
    }),
    [profileIds, commentIds],
  );
};
