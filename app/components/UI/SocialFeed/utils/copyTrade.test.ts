import {
  mockClosedPerpsFeedItem,
  mockClosedSpotFeedItem,
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../mocks/socialV1Feed.mock';
import { isCopyTradeable, shouldShowCopyTradeCta } from './copyTrade';

describe('isCopyTradeable', () => {
  it('accepts an open perps position', () => {
    expect(isCopyTradeable(mockOpenPerpsFeedItem())).toBe(true);
  });

  it('accepts an open spot position', () => {
    expect(isCopyTradeable(mockOpenSpotFeedItem())).toBe(true);
  });

  // Nothing is left to mirror once the position is gone.
  it('rejects a closed perps position', () => {
    expect(isCopyTradeable(mockClosedPerpsFeedItem())).toBe(false);
  });

  it('rejects a closed spot position', () => {
    expect(isCopyTradeable(mockClosedSpotFeedItem())).toBe(false);
  });

  it('hides perps when a feed handler is wired, still shows spot', () => {
    const perps = mockOpenPerpsFeedItem();
    const spot = mockOpenSpotFeedItem();

    expect(shouldShowCopyTradeCta(perps, false)).toBe(true);
    expect(shouldShowCopyTradeCta(spot, false)).toBe(true);
    expect(shouldShowCopyTradeCta(perps, true)).toBe(false);
    expect(shouldShowCopyTradeCta(spot, true)).toBe(true);
  });

  it('defers to the flag on a composer spot share', () => {
    const share = {
      ...mockOpenSpotFeedItem(),
      variant: 'spotShare' as const,
    };

    expect(isCopyTradeable({ ...share, showCopyTrade: true })).toBe(true);
    expect(isCopyTradeable({ ...share, showCopyTrade: false })).toBe(false);
    expect(isCopyTradeable(share)).toBe(false);
  });
});
