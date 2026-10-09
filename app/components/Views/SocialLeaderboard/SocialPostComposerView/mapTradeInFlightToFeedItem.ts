import type {
  SocialV1FeedAuthor,
  SocialV1FeedItem,
} from '../../../UI/SocialFeed/types';
import { COMPOSER_FEED_AUTHOR } from './mapPositionToFeedItem';
import type { SocialPostComposerViewParams } from './SocialPostComposerView.types';

export type TradeInFlightPreview = SocialPostComposerViewParams['preview'];

/**
 * Builds a sparse `spotShare` card from the swap facts we have at submit
 * time. PnL, market cap, and hold time are omitted until the trade is indexed.
 */
export const mapTradeInFlightToFeedItem = (
  preview: TradeInFlightPreview,
  comment: string,
  options?: { author?: SocialV1FeedAuthor; timestamp?: number },
): SocialV1FeedItem => {
  const author = options?.author ?? COMPOSER_FEED_AUTHOR;
  const timestamp = options?.timestamp ?? Date.now();
  const id = `composer-in-flight-${preview.chain}-${preview.tokenAddress}`;

  return {
    id,
    author,
    timestamp,
    variant: 'spotShare',
    comment,
    asset: {
      symbol: preview.tokenSymbol,
      avatar: {
        positionId: id,
        chain: preview.chain,
        tokenAddress: preview.tokenAddress,
        tokenImageUrl: preview.tokenImageUrl ?? null,
        tokenSymbol: preview.tokenSymbol,
      },
    },
    side: preview.side,
    costLabel: preview.costLabel,
    entryPriceLabel: preview.entryPriceLabel,
    valueLabel: '',
    pnlLabel: '',
    isPnlPositive: true,
    showCopyTrade: false,
  };
};
