import type {
  SocialV1FeedAuthor,
  SocialV1FeedItem,
} from '../../../UI/SocialFeed/types';
import { HYPERLIQUID_CHAIN_NAME } from '../../../UI/SocialFeed/utils/perp';
import { COMPOSER_FEED_AUTHOR } from './mapPositionToFeedItem';
import type { SocialPostPerpsPreview } from './SocialPostComposerView.types';

/**
 * Builds a sparse `perpsOpen` card from the order facts we have when
 * Hyperliquid accepts it. PnL and hold time wait until the fill is indexed.
 */
export const mapPerpsOrderInFlightToFeedItem = (
  preview: SocialPostPerpsPreview,
  comment: string,
  options?: { author?: SocialV1FeedAuthor; timestamp?: number },
): SocialV1FeedItem => {
  const author = options?.author ?? COMPOSER_FEED_AUTHOR;
  const timestamp = options?.timestamp ?? Date.now();
  const id = `composer-in-flight-perps-${preview.tradeSymbol}`;

  return {
    id,
    author,
    timestamp,
    variant: 'perpsOpen',
    comment,
    tradeSymbol: preview.tradeSymbol,
    direction: preview.direction,
    leverageLabel: preview.leverageLabel,
    asset: {
      symbol: preview.tokenSymbol,
      avatar: {
        positionId: id,
        chain: HYPERLIQUID_CHAIN_NAME,
        tokenAddress: preview.tokenAddress,
        tokenImageUrl: null,
        tokenSymbol: preview.tokenSymbol,
      },
    },
    costLabel: preview.costLabel,
    entryPriceLabel: preview.entryPriceLabel,
    valueLabel: '',
    pnlLabel: '',
    isPnlPositive: true,
    showCopyTrade: false,
  };
};
