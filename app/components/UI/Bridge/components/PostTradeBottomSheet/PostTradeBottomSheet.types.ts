import type { BridgeToken } from '../../types';
import type { PostTradeShareSheetCountKey } from '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/resolvePostTradePrompt';
import type { SocialPostTradePreview } from '../../../../Views/SocialLeaderboard/SocialPostComposerView/SocialPostComposerView.types';

export enum PostTradeStatus {
  InProgress = 'in_progress',
  Success = 'success',
  Failed = 'failed',
}

/**
 * Social share context for a swap that passed the post-trade rules at submit.
 * Serializable, since it travels in navigation params.
 */
export interface SwapSocialPostTrade {
  /** Linked wallet and the swaps counter the successful trade will use up. */
  countKey: PostTradeShareSheetCountKey;
  /** Social API `tradeInFlight.chain` slug for the position token. */
  tradeInFlightChain: string;
  /**
   * Which hash the post uses. A bridged buy's position is on the destination
   * chain, so it uses the destination hash. Everything else uses the
   * submitted hash.
   */
  txHash: 'submitted' | 'destination';
  preview: SocialPostTradePreview;
}

export interface PostTradeBottomSheetParams {
  status: PostTradeStatus;
  transactionMetaId?: string;
  transactionHash?: string;
  sourceAmount?: string;
  destAmount?: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  socialPostTrade?: SwapSocialPostTrade;
}
