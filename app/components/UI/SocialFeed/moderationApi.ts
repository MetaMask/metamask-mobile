import Engine from '../../../core/Engine';

/**
 * Not a `SocialService:*` key on purpose: the lists below are assembled from
 * every page, so they must not share a cache entry with a single-page call.
 */
export const BLOCKED_PROFILE_IDS_QUERY_KEY = [
  'social',
  'moderation',
  'blockedProfileIds',
] as const;

export const BLOCKED_COMMENT_IDS_QUERY_KEY = [
  'social',
  'moderation',
  'blockedCommentIds',
] as const;

export const MODERATION_STATUS_QUERY_KEY = [
  'social',
  'moderation',
  'status',
] as const;

/** Whether the moderation team banned the viewer, from `GET /v1/moderation/status`. */
export interface SocialModerationStatus {
  banned: boolean;
  /** Unix epoch seconds. */
  bannedAt: number | null;
  /** The reason the moderation team gave the viewer, if any. Safe to show. */
  reason: string | null;
}

interface ModerationStatusMessenger {
  call: (
    action: 'SocialService:fetchModerationStatus',
  ) => Promise<SocialModerationStatus>;
}

/** A runaway cursor must not page forever; 250 per page × 20 is plenty. */
const MAX_PAGES = 20;

const fetchAllPages = async <TItem>(
  fetchPage: (
    cursor: string | undefined,
  ) => Promise<{ items: TItem[]; cursor: string | null }>,
): Promise<TItem[]> => {
  const items: TItem[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetchPage(cursor);
    items.push(...response.items);
    if (!response.cursor) {
      break;
    }
    cursor = response.cursor;
  }
  return items;
};

/** Profile ids of every trader the viewer has blocked. */
export const fetchBlockedProfileIds = async (): Promise<string[]> => {
  const items = await fetchAllPages((cursor) =>
    Engine.controllerMessenger.call(
      'SocialService:fetchBlockedProfiles',
      cursor ? { cursor } : undefined,
    ),
  );
  return items.map((item) => item.profile.profileId);
};

/** Ids of every comment the viewer has reported or hidden. */
export const fetchBlockedCommentIds = async (): Promise<string[]> => {
  const items = await fetchAllPages((cursor) =>
    Engine.controllerMessenger.call(
      'SocialService:fetchBlockedContent',
      cursor ? { cursor } : undefined,
    ),
  );
  return items.filter((item) => item.type === 'comment').map((item) => item.id);
};

/**
 * The viewer's ban status. Call as a member expression so the messenger keeps
 * its `this` binding.
 */
export const fetchModerationStatus = (): Promise<SocialModerationStatus> =>
  (Engine.controllerMessenger as unknown as ModerationStatusMessenger).call(
    'SocialService:fetchModerationStatus',
  );

/**
 * Refetches the viewer's ban status, after the social API refused one of their
 * writes. Imported lazily, like {@link invalidateBlockLists}.
 */
export const invalidateModerationStatus = async (): Promise<void> => {
  const { default: ReactQueryService } = await import(
    '../../../core/ReactQueryService'
  );
  await ReactQueryService.queryClient.invalidateQueries({
    queryKey: MODERATION_STATUS_QUERY_KEY,
  });
};

/** Blocks a trader for the viewer. */
export const blockProfile = (profileId: string): Promise<void> =>
  Engine.controllerMessenger.call('SocialService:block', { profileId });

/**
 * Hides a comment for the viewer. With a `reason` this is a report: the
 * social API screens the comment and, when needed, sends it to moderators.
 */
export const blockComment = (
  commentId: string,
  reason?: string,
): Promise<void> =>
  Engine.controllerMessenger.call('SocialService:block', {
    commentId,
    ...(reason ? { reason } : {}),
  });

/**
 * Refetches both block lists after the viewer blocks something. Imported
 * lazily, like `useFollowToggle`, to keep the Engine out of this module's
 * import graph.
 */
export const invalidateBlockLists = async (): Promise<void> => {
  const { default: ReactQueryService } = await import(
    '../../../core/ReactQueryService'
  );
  await Promise.all([
    ReactQueryService.queryClient.invalidateQueries({
      queryKey: BLOCKED_PROFILE_IDS_QUERY_KEY,
    }),
    ReactQueryService.queryClient.invalidateQueries({
      queryKey: BLOCKED_COMMENT_IDS_QUERY_KEY,
    }),
  ]);
};
