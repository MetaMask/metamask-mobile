import { MINUTE } from '../../../../../constants/time';
import type { SocialV1FeedPost } from '../../SocialV1View/feed/types';
import {
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../../SocialV1View/feed/mocks/socialV1Feed.mock';

const minutesAgo = (minutes: number) => Date.now() - minutes * MINUTE;

/**
 * Static Live trades tab fixtures until the websocket stream lands. Open
 * positions mirror the Trending card layout (Copy trade, live PnL).
 */
export const MOCK_LIVE_TRADES_POSTS: SocialV1FeedPost[] = [
  {
    id: 'live-trade-post-jeanphil',
    authorHandle: 'iamthefaceof.sol',
    authorImageUrl: null,
    winRateLabel: '68% WR*',
    timestampMs: minutesAgo(1),
    commentId: 'live-trade-comment-jeanphil',
    reactions: [],
    item: mockOpenSpotFeedItem({
      id: 'live-trade-jeanphil',
      timestamp: minutesAgo(1),
      asset: {
        symbol: 'JEANPHIL',
        avatar: {
          positionId: 'live-pos-jeanphil',
          chain: 'solana',
          tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
          tokenImageUrl: null,
          tokenSymbol: 'JEANPHIL',
        },
      },
      side: 'sell',
      markPriceLabel: '$0.003068*',
      entryPriceLabel: '$0.003166',
      holdTimeLabel: '1d 16h',
      valueLabel: '$18,982.17',
      pnlLabel: '+9.11%',
      isPnlPositive: true,
    }),
  },
  {
    id: 'live-trade-post-incoginu',
    authorHandle: '8p4F...CTFs',
    authorImageUrl: null,
    winRateLabel: '72% WR*',
    timestampMs: minutesAgo(17),
    commentId: 'live-trade-comment-incoginu',
    reactions: [],
    item: mockOpenSpotFeedItem({
      id: 'live-trade-incoginu',
      timestamp: minutesAgo(17),
      asset: {
        symbol: 'INCOGINU',
        avatar: {
          positionId: 'live-pos-incoginu',
          chain: 'solana',
          tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
          tokenImageUrl: null,
          tokenSymbol: 'INCOGINU',
        },
      },
      side: 'buy',
      markPriceLabel: '$0.004821*',
      entryPriceLabel: '$0.004900',
      holdTimeLabel: '17m',
      valueLabel: '$4,210.50',
      pnlLabel: '-2.00%',
      isPnlPositive: false,
    }),
  },
  {
    id: 'live-trade-post-btc-perp',
    authorHandle: 'thedefimetro.sol',
    authorImageUrl: null,
    winRateLabel: '64% WR*',
    timestampMs: minutesAgo(39),
    commentId: 'live-trade-comment-btc-perp',
    reactions: [],
    item: mockOpenPerpsFeedItem({
      id: 'live-trade-wbtc-short',
      timestamp: minutesAgo(39),
      asset: {
        symbol: 'WBTC',
        avatar: {
          positionId: 'live-pos-wbtc',
          chain: 'hyperliquid',
          tokenAddress: '',
          tokenImageUrl: null,
          tokenSymbol: 'WBTC',
        },
      },
      direction: 'short',
      markPriceLabel: '$94,120*',
      valueLabel: '-$0.16',
      pnlLabel: '-1.45%',
      isPnlPositive: false,
      leverageLabel: '5x',
      entryPriceLabel: '$94,850',
      holdTimeLabel: '39m',
    }),
  },
];
