import type {
  SocialV1FeedAuthor,
  SocialV1FeedItem,
} from '../../../UI/SocialFeed/types';
import { HYPERLIQUID_CHAIN_NAME } from '../../../UI/SocialFeed/utils/perp';
import { COMPOSER_FEED_AUTHOR, commentGifField } from './mapPositionToFeedItem';
import type { SocialPostPerpsPreview } from './SocialPostComposerView.types';

/**
 * Builds a sparse `perpsOpen` card, or a `perpsClosed` one for a full close,
 * from the order facts we have when Hyperliquid accepts it. Hold time, and
 * PnL on an open, wait until the fill is indexed.
 */
export const mapPerpsOrderInFlightToFeedItem = (
  preview: SocialPostPerpsPreview,
  comment: string,
  options?: {
    author?: SocialV1FeedAuthor;
    timestamp?: number;
    /** KLIPY GIF attached to the caption, carried so a GIF-only post still reads as commented. */
    commentGifUrl?: string;
  },
): SocialV1FeedItem => {
  const author = options?.author ?? COMPOSER_FEED_AUTHOR;
  const timestamp = options?.timestamp ?? Date.now();
  const id = `composer-in-flight-perps-${preview.tradeSymbol}`;
  const gif = commentGifField(options?.commentGifUrl);
  const base = {
    id,
    author,
    timestamp,
    comment,
    ...gif,
    direction: preview.direction,
    leverageLabel: preview.leverageLabel,
    asset: {
      symbol: preview.tokenSymbol,
      avatar: {
        positionId: id,
        chain: HYPERLIQUID_CHAIN_NAME,
        tokenAddress: preview.tokenAddress,
        tokenImageUrl: null,
        // The market id (`xyz:SPCX` for HIP-3), not the display symbol. The
        // icon CDN keys HIP-3 markets on the prefixed id, so the display
        // symbol (`SPCX`) resolves to a 404 and the avatar falls back to a letter.
        tokenSymbol: preview.tradeSymbol,
      },
    },
    costLabel: preview.costLabel,
    entryPriceLabel: preview.entryPriceLabel,
  };

  if (preview.action === 'close') {
    return {
      ...base,
      variant: 'perpsClosed',
      exitPriceLabel: preview.exitPriceLabel,
      pnlLabel: preview.pnlLabel ?? '',
      // A closed card reads its USD P&L from `valueLabel`, as the feed does.
      valueLabel: preview.pnlValueLabel ?? '',
      isPnlPositive: preview.isPnlPositive ?? true,
      closedAtMs: timestamp,
    };
  }

  return {
    ...base,
    variant: 'perpsOpen',
    valueLabel: '',
    tradeSymbol: preview.tradeSymbol,
    pnlLabel: '',
    isPnlPositive: true,
    showCopyTrade: false,
  };
};
