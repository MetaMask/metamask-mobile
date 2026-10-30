import { KLIPY_STATIC_GIF_EXAMPLE } from '#app/components/UI/SocialFeed/utils/klipyGifComment';
import { getPositionCardMode } from '#app/components/UI/SocialFeed/utils/positionCardMode';
import { mapPerpsOrderInFlightToFeedItem } from './mapPerpsOrderInFlightToFeedItem';
import type { SocialPostPerpsPreview } from './SocialPostComposerView.types';

const preview: SocialPostPerpsPreview = {
  product: 'perps',
  tokenSymbol: 'ETH',
  tradeSymbol: 'ETH',
  tokenAddress: 'ETH',
  direction: 'long',
  leverageLabel: '40x',
  costLabel: '$100.00',
  entryPriceLabel: '$3,200.00',
};

describe('mapPerpsOrderInFlightToFeedItem', () => {
  it('maps an accepted order to a sparse perpsOpen card without copy trade', () => {
    const item = mapPerpsOrderInFlightToFeedItem(preview, 'this is alpha');

    expect(item.variant).toBe('perpsOpen');
    if (item.variant !== 'perpsOpen') {
      return;
    }
    expect(item.comment).toBe('this is alpha');
    expect(item.asset.symbol).toBe('ETH');
    expect(item.tradeSymbol).toBe('ETH');
    expect(item.direction).toBe('long');
    expect(item.leverageLabel).toBe('40x');
    expect(item.costLabel).toBe('$100.00');
    expect(item.entryPriceLabel).toBe('$3,200.00');
    expect(item.showCopyTrade).toBe(false);
    expect(item.pnlLabel).toBe('');
    expect(item.holdTimeLabel).toBeUndefined();
  });

  it('carries the KLIPY GIF URL as commentGifUrl for a GIF-only perps post', () => {
    const item = mapPerpsOrderInFlightToFeedItem(preview, '', {
      commentGifUrl: KLIPY_STATIC_GIF_EXAMPLE,
    });

    expect(item).toMatchObject({
      comment: '',
      commentGifUrl: KLIPY_STATIC_GIF_EXAMPLE,
    });
    expect(getPositionCardMode(item)).toBe('open');
  });

  it('ignores a commentGifUrl that is not a KLIPY static GIF for a perps post', () => {
    const item = mapPerpsOrderInFlightToFeedItem(preview, '', {
      commentGifUrl: 'https://media.test/party.gif',
    });

    expect(item).not.toHaveProperty('commentGifUrl');
    expect(getPositionCardMode(item)).toBe('openCompact');
  });
});
