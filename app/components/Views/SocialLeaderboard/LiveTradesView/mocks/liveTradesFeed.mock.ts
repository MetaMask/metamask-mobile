import { MINUTE } from '../../../../../constants/time';
import { mapFeedItem } from '../../FeedView/utils/mapFeedItem';
import type { FeedItem } from '../../FeedView/types';
import {
  mockPerpFeedItem,
  mockSpotFeedItem,
} from '../../FeedView/mocks/coreFeed.mock';

const minutesAgoSec = (minutes: number) =>
  Math.floor((Date.now() - minutes * MINUTE) / 1000);

const requireFeedItem = (item: ReturnType<typeof mapFeedItem>): FeedItem => {
  if (!item) {
    throw new Error('liveTradesFeed.mock: mapFeedItem returned null');
  }
  return item;
};

/**
 * Static Live trades fixtures until the websocket stream lands. Uses the V0
 * `FeedItem` shape so rows render through `FeedItemRow`.
 */
export const MOCK_LIVE_TRADES_ITEMS: FeedItem[] = [
  requireFeedItem(
    mapFeedItem(
      mockSpotFeedItem({
        positionId: 'live-trade-pepe',
        tokenSymbol: 'PEPE',
        tokenName: 'Pepe',
        currentValueUSD: 172_970,
        pnlValueUsd: -1_315,
        pnlPercent: -0.76,
        timestamp: minutesAgoSec(13),
        lastTradeAt: minutesAgoSec(13),
        actor: {
          profileId: 'live-trader-sebastian',
          address: '0x1111111111111111111111111111111111111111',
          name: 'sebastian',
          imageUrl: null,
        },
      }),
    ),
  ),
  requireFeedItem(
    mapFeedItem(
      mockSpotFeedItem({
        positionId: 'live-trade-googl',
        tokenSymbol: 'GOOGL',
        tokenName: 'Alphabet',
        tokenAddress: '0x0000000000000000000000000000000000000002',
        currentValueUSD: 9_270,
        pnlValueUsd: 844,
        pnlPercent: 9.12,
        timestamp: minutesAgoSec(21),
        lastTradeAt: minutesAgoSec(21),
        actor: {
          profileId: 'live-trader-pepe-punk',
          address: '0x2222222222222222222222222222222222222222',
          name: 'pepe-punk',
          imageUrl: null,
        },
      }),
    ),
  ),
  requireFeedItem(
    mapFeedItem(
      mockPerpFeedItem({
        positionId: 'live-trade-msft-short',
        tokenSymbol: 'MSFT',
        tokenName: 'Microsoft',
        currentValueUSD: 48_500,
        pnlValueUsd: -620,
        pnlPercent: -1.28,
        timestamp: minutesAgoSec(34),
        lastTradeAt: minutesAgoSec(34),
        actor: {
          profileId: 'live-trader-msft-whale',
          address: '0x3333333333333333333333333333333333333333',
          name: 'macro-msft',
          imageUrl: null,
        },
      }),
    ),
  ),
];
