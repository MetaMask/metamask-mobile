import type {
  FeedResponse,
  TokenFeedChain,
} from '@metamask/social-controllers';
import Engine from '../../../../../../core/Engine';

/** Page size for the token feed. The route allows 1–100 and defaults to 25. */
export const TOKEN_FEED_PAGE_LIMIT = 25;

/** Chain and contract the selected hot-token chip can load a feed for. */
export interface TokenFeedTarget {
  chain: string;
  contractAddress: string;
}

export const buildTokenFeedQueryKey = (
  target: TokenFeedTarget,
): [string, TokenFeedTarget] => ['SocialService:fetchTokenFeed', target];

/**
 * Fetches one token-feed page via `SocialService:fetchTokenFeed`.
 *
 * Call as a member expression so the messenger keeps its `this` binding;
 * aliasing `.call` into a local detaches it and breaks action lookup.
 */
export const fetchTokenFeedPage = (
  target: TokenFeedTarget,
  pageParam?: string,
): Promise<FeedResponse> =>
  Engine.controllerMessenger.call('SocialService:fetchTokenFeed', {
    // Feed rows carry the chain as a string. The request still sends that
    // value; TokenFeedChain is the published option type.
    chain: target.chain as TokenFeedChain,
    contractAddress: target.contractAddress,
    limit: TOKEN_FEED_PAGE_LIMIT,
    ...(pageParam ? { olderThan: pageParam } : {}),
  });
