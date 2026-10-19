/** Page size for the token feed. The route allows 1–100 and defaults to 25. */
export const TOKEN_FEED_PAGE_LIMIT = 25;

/** Chain and contract the selected hot-token chip can load a feed for. */
export interface TokenFeedTarget {
  chain: string;
  contractAddress: string;
}
