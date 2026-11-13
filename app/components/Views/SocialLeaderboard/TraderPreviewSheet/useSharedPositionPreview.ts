import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  resolveSharedSocialPosition,
  type SharedSocialPosition,
} from '../../../../core/DeeplinkManager/handlers/legacy/socialPositionSheetDeeplink';
import type { SocialV1FeedItem } from '../../../UI/SocialFeed/types';
import { mapPositionToFeedItem } from '../SocialPostComposerView/mapPositionToFeedItem';

const LOG_PREFIX = '[TraderPreviewSheet]';

/**
 * Query for a shared position preview. The link handler prefetches it so the
 * sheet usually opens with the card already loaded.
 */
export const buildSharedPositionPreviewQuery = (
  positionId: string,
  traderId: string,
) => ({
  queryKey: ['SocialTraderPreview:sharedPosition', positionId, traderId],
  queryFn: async (): Promise<SharedSocialPosition | null> =>
    (await resolveSharedSocialPosition(positionId, traderId, LOG_PREFIX)) ??
    null,
});

export interface SharedPositionPreview {
  /** The position as a feed card, or `null` while loading or when it failed. */
  feedItem: SocialV1FeedItem | null;
  /**
   * The trader who owns the position. Differs from the link's trader when
   * the link named the wrong one, in which case the preview shows the owner.
   */
  ownerTraderId: string | undefined;
  isLoading: boolean;
}

/**
 * Loads the position a shared link points to and maps it to the feed card
 * model. Prices are the fetched snapshot: the preview does not stream.
 *
 * @param positionId - The shared position, or `undefined` for a profile link.
 * @param traderId - The trader the link names.
 */
export const useSharedPositionPreview = (
  positionId: string | undefined,
  traderId: string,
): SharedPositionPreview => {
  const { data, isLoading } = useQuery<SharedSocialPosition | null>({
    ...buildSharedPositionPreviewQuery(positionId ?? '', traderId),
    enabled: Boolean(positionId),
    staleTime: 0,
    retry: false,
  });

  const feedItem = useMemo(
    () =>
      data
        ? mapPositionToFeedItem(data.position, '', {
            author: data.author,
            liveTicks: false,
          })
        : null,
    [data],
  );

  return {
    feedItem,
    ownerTraderId: data?.author.id,
    isLoading: Boolean(positionId) && isLoading,
  };
};
