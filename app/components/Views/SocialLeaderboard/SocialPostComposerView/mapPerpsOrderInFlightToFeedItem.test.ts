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
});
