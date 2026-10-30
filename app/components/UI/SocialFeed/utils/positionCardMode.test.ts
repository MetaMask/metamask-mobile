import {
  mockClosedPerpsFeedItem,
  mockClosedSpotFeedItem,
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../mocks/socialV1Feed.mock';
import { getPositionCardMode } from './positionCardMode';

describe('getPositionCardMode', () => {
  it('returns open for an open perps position with a comment', () => {
    const item = mockOpenPerpsFeedItem({ comment: 'Leverage is a lifestyle.' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('open');
  });

  it('returns open for an open spot position with a comment', () => {
    const item = mockOpenSpotFeedItem({ comment: 'Long the dip.' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('open');
  });

  it('returns closed for a closed perps position with a comment', () => {
    const item = mockClosedPerpsFeedItem({ comment: 'Risk managed. Mostly.' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('closed');
  });

  it('returns closed for a closed spot position with a comment', () => {
    const item = mockClosedSpotFeedItem({ comment: 'Took profit early.' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('closed');
  });

  it('returns liveCompact for an open perps position without a comment', () => {
    const item = mockOpenPerpsFeedItem({ comment: undefined });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('liveCompact');
  });

  it('returns liveCompact for an open spot position without a comment', () => {
    const item = mockOpenSpotFeedItem();

    const mode = getPositionCardMode(item);

    expect(mode).toBe('liveCompact');
  });

  it('returns closedCompact for a closed perps position without a comment', () => {
    const item = mockClosedPerpsFeedItem({ comment: undefined });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('closedCompact');
  });

  it('returns closedCompact for a closed spot position without a comment', () => {
    const item = mockClosedSpotFeedItem();

    const mode = getPositionCardMode(item);

    expect(mode).toBe('closedCompact');
  });

  it('treats an empty comment as no comment', () => {
    const item = mockOpenSpotFeedItem({ comment: '' });

    const mode = getPositionCardMode(item);

    expect(mode).toBe('liveCompact');
  });

  it('treats a composer spot share with a comment as open', () => {
    const item = {
      ...mockOpenSpotFeedItem({ comment: 'Shared from the composer.' }),
      variant: 'spotShare' as const,
    };

    const mode = getPositionCardMode(item);

    expect(mode).toBe('open');
  });

  it('treats a composer spot share without a comment as live compact', () => {
    const item = {
      ...mockOpenSpotFeedItem(),
      variant: 'spotShare' as const,
    };

    const mode = getPositionCardMode(item);

    expect(mode).toBe('liveCompact');
  });
});
