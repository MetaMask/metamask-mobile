import type {
  FeedResponse,
  FetchTraderFeedOptions,
} from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import { FEED_PAGE_LIMIT } from '../../FeedView/hooks/traderFeedQueries';

export const MY_PROFILE_POSTS_COMMENTED_ONLY = true;

export const buildMyProfileFeedQueryKey = (
  addressOrId: string,
): [string, FetchTraderFeedOptions] => [
  'SocialService:fetchTraderFeed',
  {
    addressOrId,
    commentedOnly: MY_PROFILE_POSTS_COMMENTED_ONLY,
    limit: FEED_PAGE_LIMIT,
  },
];

/**
 * Fetches one page of the owner's commented positions as feed items.
 *
 * Call as a member expression so the messenger keeps its `this` binding.
 */
export const fetchMyProfileFeedPage = (
  addressOrId: string,
  pageParam?: string,
): Promise<FeedResponse> => {
  const messenger = Engine.controllerMessenger as unknown as {
    call: (
      action: 'SocialService:fetchTraderFeed',
      fetchOptions: FetchTraderFeedOptions,
    ) => Promise<FeedResponse>;
  };
  return messenger.call('SocialService:fetchTraderFeed', {
    addressOrId,
    commentedOnly: MY_PROFILE_POSTS_COMMENTED_ONLY,
    limit: FEED_PAGE_LIMIT,
    ...(pageParam ? { olderThan: pageParam } : {}),
  });
};
