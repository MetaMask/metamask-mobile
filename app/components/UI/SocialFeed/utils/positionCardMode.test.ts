import type { SocialV1SpotShareFeedItem } from '../types';
import {
  mockClosedPerpsFeedItem,
  mockClosedSpotFeedItem,
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../mocks/socialV1Feed.mock';
import { KLIPY_STATIC_GIF_EXAMPLE } from './klipyGifComment';
import { getPositionCardMode } from './positionCardMode';

describe('getPositionCardMode', () => {
  it('returns open for a commented open perps position', () => {
    const item = mockOpenPerpsFeedItem({ comment: 'Long the trend' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('open');
  });

  it('returns open for a commented open spot position', () => {
    const item = mockOpenSpotFeedItem({ comment: 'Buying the dip' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('open');
  });

  it('returns closed for a commented closed perps position', () => {
    const item = mockClosedPerpsFeedItem({ comment: 'Done for the day' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('closed');
  });

  it('returns closed for a commented closed spot position', () => {
    const item = mockClosedSpotFeedItem({ comment: 'Took profit' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('closed');
  });

  it('returns openCompact for an open perps position without a comment', () => {
    const item = mockOpenPerpsFeedItem({ comment: undefined });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('openCompact');
  });

  it('returns openCompact for an open spot position without a comment', () => {
    const item = mockOpenSpotFeedItem({ comment: undefined });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('openCompact');
  });

  it('returns closedCompact for a closed perps position without a comment', () => {
    const item = mockClosedPerpsFeedItem({ comment: undefined });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('closedCompact');
  });

  it('returns closedCompact for a closed spot position without a comment', () => {
    const item = mockClosedSpotFeedItem({ comment: undefined });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('closedCompact');
  });

  it('treats an empty comment as no comment', () => {
    const item = mockOpenSpotFeedItem({ comment: '' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('openCompact');
  });

  it('treats a gif-only comment as commented for an open perps position', () => {
    const item = mockOpenPerpsFeedItem({
      comment: undefined,
      commentGifUrl: KLIPY_STATIC_GIF_EXAMPLE,
    });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('open');
  });

  it('treats a gif-only comment as commented for a closed perps position', () => {
    const item = mockClosedPerpsFeedItem({
      comment: undefined,
      commentGifUrl: KLIPY_STATIC_GIF_EXAMPLE,
    });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('closed');
  });

  it('returns open for an uncommented open perps position when expanded', () => {
    const item = mockOpenPerpsFeedItem({ comment: undefined });

    const mode = getPositionCardMode(item, { expanded: true });

    expect(mode).toBe('open');
  });

  it('returns closed for an uncommented closed spot position when expanded', () => {
    const item = mockClosedSpotFeedItem({ comment: undefined });

    const mode = getPositionCardMode(item, { expanded: true });

    expect(mode).toBe('closed');
  });

  it('keeps the compact mode for an uncommented open perps position when expanded is false', () => {
    const item = mockOpenPerpsFeedItem({ comment: undefined });

    const mode = getPositionCardMode(item, { expanded: false });

    expect(mode).toBe('openCompact');
  });

  it('treats a commented composer spot share as open', () => {
    const share: SocialV1SpotShareFeedItem = {
      id: 'composer-spot-share',
      author: mockOpenSpotFeedItem().author,
      timestamp: Date.now(),
      variant: 'spotShare',
      comment: 'Shared from the composer',
      asset: mockOpenSpotFeedItem().asset,
      side: 'buy',
      valueLabel: '$1,000.00',
      pnlLabel: '+2.0%',
      isPnlPositive: true,
    };

    const mode = getPositionCardMode(share);

    expect(mode).toBe('open');
  });
});
