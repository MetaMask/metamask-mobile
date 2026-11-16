import {
  mockClosedPerpsFeedItem,
  mockClosedSpotFeedItem,
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../types';
import {
  buildSocialPositionAnalytics,
  socialFeedPostAnalytics,
} from './socialPositionAnalytics';

const post = (
  item: SocialV1FeedPost['item'],
  authorHandle = '',
): SocialV1FeedPost => ({
  id: 'post-1',
  authorHandle,
  authorImageUrl: null,
  timestampMs: 0,
  reactions: [],
  item,
});

describe('buildSocialPositionAnalytics', () => {
  it('describes an open perp with its side and trader', () => {
    expect(
      buildSocialPositionAnalytics({
        isPerp: true,
        asset: 'BTC',
        direction: 'short',
        isClosed: false,
        author: { address: '0xabc', username: 'doji' },
      }),
    ).toEqual({
      trade_type: 'perps',
      asset: 'BTC',
      direction: 'short',
      position_status: 'open',
      trader_address: '0xabc',
      trader_username: 'doji',
    });
  });

  it('drops the side for spot and omits unknown fields', () => {
    expect(
      buildSocialPositionAnalytics({ isPerp: false, direction: 'long' }),
    ).toEqual({ trade_type: 'spot' });
  });
});

describe('socialFeedPostAnalytics', () => {
  it('reads an open perps card', () => {
    expect(socialFeedPostAnalytics(post(mockOpenPerpsFeedItem()))).toEqual({
      trade_type: 'perps',
      asset: 'BTC',
      direction: 'short',
      position_status: 'open',
      trader_address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      trader_username: 'Doji',
    });
  });

  it('marks closed perps and spot cards as closed', () => {
    expect(
      socialFeedPostAnalytics(post(mockClosedPerpsFeedItem())),
    ).toMatchObject({ trade_type: 'perps', position_status: 'closed' });
    expect(
      socialFeedPostAnalytics(post(mockClosedSpotFeedItem())),
    ).toMatchObject({ trade_type: 'spot', position_status: 'closed' });
  });

  it('prefers the post handle over the author username', () => {
    const analytics = socialFeedPostAnalytics(
      post(mockOpenSpotFeedItem(), 'frog.eth'),
    );

    expect(analytics).toEqual({
      trade_type: 'spot',
      asset: 'PUMP',
      position_status: 'open',
      trader_address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      trader_username: 'frog.eth',
    });
  });
});
