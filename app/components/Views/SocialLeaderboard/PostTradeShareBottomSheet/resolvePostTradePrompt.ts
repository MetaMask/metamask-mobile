import type { PostTradePromptProduct } from '../../../../util/social/postTradePromptStorage';

/** Share sheets shown per product on the linked account before the toast takes over. */
export const POST_TRADE_SHARE_SHEET_LIMIT = 3;

export interface PostTradeShareSheetCountKey {
  /** Linked EVM address the count is stored under. */
  address: string;
  product: PostTradePromptProduct;
}

export type PostTradePrompt =
  | { kind: 'none' }
  | { kind: 'share_sheet'; countKey: PostTradeShareSheetCountKey }
  | { kind: 'claim_sheet' }
  | { kind: 'post_to_feed_toast' };

export interface ResolvePostTradePromptInput {
  product: PostTradePromptProduct;
  isSocialV1Enabled: boolean;
  /** Social profile wallet. Empty means the user has no social profile. */
  linkedEvmAddress: string | null | undefined;
  /** Existing social profile has disabled trading activity sharing. */
  isProfileTradingActivityPrivate: boolean;
  isLinkedAccountInSelectedGroup: boolean;
  shareSheetCount: number;
  hasSeenClaimSheet: boolean;
}

/**
 * Decides which post-trade prompt a Quick Buy swap or a Perps market order
 * gets. Social V1 copy-trades do not go through this; they always show the
 * share sheet.
 */
export const resolvePostTradePrompt = ({
  product,
  isSocialV1Enabled,
  linkedEvmAddress,
  isProfileTradingActivityPrivate,
  isLinkedAccountInSelectedGroup,
  shareSheetCount,
  hasSeenClaimSheet,
}: ResolvePostTradePromptInput): PostTradePrompt => {
  if (!isSocialV1Enabled) {
    return { kind: 'none' };
  }
  const address = linkedEvmAddress?.trim();
  if (!address) {
    return hasSeenClaimSheet ? { kind: 'none' } : { kind: 'claim_sheet' };
  }
  if (isProfileTradingActivityPrivate) {
    return { kind: 'none' };
  }
  if (!isLinkedAccountInSelectedGroup) {
    return { kind: 'none' };
  }
  if (shareSheetCount < POST_TRADE_SHARE_SHEET_LIMIT) {
    return { kind: 'share_sheet', countKey: { address, product } };
  }
  return { kind: 'post_to_feed_toast' };
};
