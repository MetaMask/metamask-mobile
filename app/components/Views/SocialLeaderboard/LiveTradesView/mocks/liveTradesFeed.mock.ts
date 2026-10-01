import { MINUTE } from '../../../../../constants/time';
import {
  mockPerpFeedItem,
  mockSpotFeedItem,
} from '../../FeedView/mocks/coreFeed.mock';
import type { LiveTradeRowModel } from '../types';
import { toLiveTradeRow } from '../utils/toLiveTradeRow';

const minutesAgoSec = (minutes: number) =>
  Math.floor((Date.now() - minutes * MINUTE) / 1000);

/**
 * Static Live trades fixtures until the websocket stream lands. Rows mirror
 * the V1 compact-card screenshots so cohort / asset / market-cap filters
 * are exercisable.
 */
export const MOCK_LIVE_TRADES_CORE = [
  mockSpotFeedItem({
    positionId: 'live-trade-pepe',
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    positionAmount: 506_243_213.9,
    currentValueUSD: 9_325,
    pnlValueUsd: -80,
    pnlPercent: -0.85,
    timestamp: minutesAgoSec(0),
    lastTradeAt: minutesAgoSec(0),
    trades: [
      {
        direction: 'buy',
        intent: 'enter',
        action: 'opened',
        tokenAmount: 506_243_213.9,
        usdCost: 9_325,
        marketCap: 5_200_000_000,
        timestamp: minutesAgoSec(0),
        transactionHash: '0xpepe',
        classification: 'spot',
      },
    ],
    actor: {
      profileId: 'live-trader-cented',
      address: '0x1111111111111111111111111111111111111111',
      name: 'cented',
      imageUrl: null,
      winRate30d: 0.56,
      pnl30d: 48_000,
      followerCount: 1_200,
    },
  }),
  mockSpotFeedItem({
    positionId: 'live-trade-nvda',
    tokenSymbol: 'NVDA',
    tokenName: 'NVIDIA',
    tokenAddress: '0x0000000000000000000000000000000000000002',
    chain: 'robinhood',
    positionAmount: 47.6633,
    currentValueUSD: 8_710,
    pnlValueUsd: 420,
    pnlPercent: 5.1,
    timestamp: minutesAgoSec(0),
    lastTradeAt: minutesAgoSec(0),
    trades: [
      {
        direction: 'buy',
        intent: 'enter',
        action: 'opened',
        tokenAmount: 47.6633,
        usdCost: 8_710,
        marketCap: 4_400_000_000_000,
        timestamp: minutesAgoSec(0),
        transactionHash: '0xnvda',
        classification: 'spot',
      },
    ],
    actor: {
      profileId: 'live-trader-tech-tactician',
      address: '0x2222222222222222222222222222222222222222',
      name: 'tech-tactician',
      imageUrl: null,
      winRate30d: 0.54,
      pnl30d: 8_000,
      followerCount: 420,
    },
  }),
  mockSpotFeedItem({
    positionId: 'live-trade-tsla',
    tokenSymbol: 'TSLA',
    tokenName: 'Tesla',
    tokenAddress: '0x0000000000000000000000000000000000000003',
    chain: 'robinhood',
    positionAmount: 5.3825,
    currentValueUSD: 2_380,
    pnlValueUsd: 180,
    pnlPercent: 8.2,
    timestamp: minutesAgoSec(0),
    lastTradeAt: minutesAgoSec(0),
    trades: [
      {
        direction: 'buy',
        intent: 'enter',
        action: 'opened',
        tokenAmount: 5.3825,
        usdCost: 2_380,
        marketCap: 1_100_000_000_000,
        timestamp: minutesAgoSec(0),
        transactionHash: '0xtsla',
        classification: 'spot',
      },
    ],
    actor: {
      profileId: 'live-trader-chip-watcher',
      address: '0x3333333333333333333333333333333333333333',
      name: 'chip-watcher',
      imageUrl: null,
      winRate30d: 0.88,
      pnl30d: 220_000,
      followerCount: 8_400,
    },
  }),
  mockPerpFeedItem({
    positionId: 'live-trade-sol-long',
    tokenSymbol: 'SOL',
    tokenName: 'Solana',
    positionAmount: 4.9282,
    currentValueUSD: 830,
    pnlValueUsd: 40,
    pnlPercent: 5.1,
    timestamp: minutesAgoSec(0),
    lastTradeAt: minutesAgoSec(0),
    isOpen: true,
    perpPositionType: 'long',
    perpLeverage: 10,
    trades: [
      {
        direction: 'buy',
        intent: 'enter',
        action: 'opened',
        tokenAmount: 4.9282,
        usdCost: 830,
        timestamp: minutesAgoSec(0),
        transactionHash: '0xsol',
        classification: 'perp',
        perpPositionType: 'long',
        perpLeverage: 10,
      },
    ],
    actor: {
      profileId: 'live-trader-liq-hunter',
      address: '0x4444444444444444444444444444444444444444',
      name: 'liq-hunter',
      imageUrl: null,
      winRate30d: 0.64,
      pnl30d: 2_500,
      followerCount: 90,
    },
  }),
  mockPerpFeedItem({
    positionId: 'live-trade-hype-short',
    tokenSymbol: 'HYPE',
    tokenName: 'Hyperliquid',
    positionAmount: 10_751.94,
    currentValueUSD: 719_520,
    pnlValueUsd: 12_000,
    pnlPercent: 1.7,
    timestamp: minutesAgoSec(35),
    lastTradeAt: minutesAgoSec(35),
    isOpen: true,
    perpPositionType: 'short',
    perpLeverage: 15,
    trades: [
      {
        direction: 'sell',
        intent: 'enter',
        action: 'opened',
        tokenAmount: 10_751.94,
        usdCost: 719_520,
        timestamp: minutesAgoSec(35),
        transactionHash: '0xhype',
        classification: 'perp',
        perpPositionType: 'short',
        perpLeverage: 15,
      },
    ],
    actor: {
      profileId: 'live-trader-pain',
      address: '0x5555555555555555555555555555555555555555',
      name: 'pain',
      imageUrl: null,
      winRate30d: 0.95,
      pnl30d: 150_000,
      followerCount: 12_000,
    },
  }),
];

export const MOCK_LIVE_TRADES_ITEMS: LiveTradeRowModel[] =
  MOCK_LIVE_TRADES_CORE.map(toLiveTradeRow);
