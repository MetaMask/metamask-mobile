import type { FeedItem } from '../types';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Mock trader feed data.
 *
 * This is a temporary stand-in until the Core `SocialService:fetchFeed` method
 * and its React Query hook land. Timestamps are relative to "now" so the UI
 * demonstrates both relative (<24h) and absolute (>24h) time formatting, and
 * spot items carry real token addresses / CAIP chains while perp items carry
 * real market symbols so the Trade button works end-to-end.
 */
export const getMockTraderFeed = (now: number = Date.now()): FeedItem[] => [
  {
    id: 'feed-1',
    type: 'spot',
    username: 'dutchiono',
    traderAddress: '0x1111111111111111111111111111111111111111',
    action: 'bought',
    timestamp: now - 21 * SECOND,
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    chain: 'eip155:1',
    chainIdHex: '0x1',
    subHeader: '$120K at $900K MC',
    valueLabel: '$123,000.5',
    pnlLabel: '+12%',
    isPnlPositive: true,
  },
  {
    id: 'feed-2',
    type: 'perps',
    username: 'aparjey',
    traderAddress: '0x2222222222222222222222222222222222222222',
    action: 'closed',
    timestamp: now - 4 * MINUTE,
    marketSymbol: 'ETH',
    marketName: 'Ethereum',
    direction: 'long',
    leverage: 8,
    subHeader: '$50.6K at $1,701.24',
    valueLabel: '$88,000.5',
    pnlLabel: '+12%',
    isPnlPositive: true,
  },
  {
    id: 'feed-3',
    type: 'spot',
    username: 'dutchiono',
    traderAddress: '0x1111111111111111111111111111111111111111',
    action: 'sold',
    timestamp: now - 10 * MINUTE,
    tokenSymbol: 'DEGEN',
    tokenName: 'Degen',
    tokenAddress: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed',
    chain: 'eip155:8453',
    chainIdHex: '0x2105',
    subHeader: '$8K at $52.5M MC',
    valueLabel: '$9000.45',
    pnlLabel: '+6%',
    isPnlPositive: true,
  },
  {
    id: 'feed-4',
    type: 'perps',
    username: 'aparjey',
    traderAddress: '0x2222222222222222222222222222222222222222',
    action: 'closed',
    timestamp: now - 14 * MINUTE,
    marketSymbol: 'BTC',
    marketName: 'Bitcoin',
    direction: 'short',
    leverage: 8,
    subHeader: '$600K at $0.0015',
    valueLabel: '$15,324.45',
    pnlLabel: '+12%',
    isPnlPositive: true,
  },
  {
    id: 'feed-5',
    type: 'spot',
    username: 'dutchiono',
    traderAddress: '0x1111111111111111111111111111111111111111',
    action: 'sold',
    timestamp: now - DAY - 11 * HOUR,
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    chain: 'eip155:1',
    chainIdHex: '0x1',
    subHeader: '$120K at $900K MC',
    valueLabel: '$123,000.5',
    pnlLabel: '+12%',
    isPnlPositive: true,
  },
  {
    id: 'feed-6',
    type: 'perps',
    username: 'aparjey',
    traderAddress: '0x2222222222222222222222222222222222222222',
    action: 'closed',
    timestamp: now - DAY - 13 * HOUR,
    marketSymbol: 'ETH',
    marketName: 'Ethereum',
    direction: 'long',
    leverage: 8,
    subHeader: '$50.6K at $1,701.24',
    valueLabel: '$88,000.5',
    pnlLabel: '+12%',
    isPnlPositive: true,
  },
];
