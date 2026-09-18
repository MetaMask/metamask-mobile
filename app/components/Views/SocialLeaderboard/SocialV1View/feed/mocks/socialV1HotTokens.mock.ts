import type { SocialV1HotToken } from '../types';

export const mockHotToken = (
  overrides: Partial<SocialV1HotToken> = {},
): SocialV1HotToken => ({
  id: 'hot-btc',
  symbol: 'BTC',
  label: 'Bitcoin perps',
  ...overrides,
});

/**
 * Static stand-in for the "what's hot right now" ranking, which does not exist
 * yet. Labels are editorial topic names rather than tickers, which is how the
 * design reads them.
 *
 * Symbols are raw perps market ids, not display symbols: equities and
 * commodities only publish icons under their HIP-3 form (`xyz:NVDA`), and the
 * bare ticker 404s on the MetaMask icon CDN. Crypto markets are the opposite --
 * bare `BTC` misses the MetaMask CDN and resolves on the HyperLiquid fallback.
 */
export const MOCK_SOCIAL_V1_HOT_TOKENS: SocialV1HotToken[] = [
  mockHotToken(),
  mockHotToken({ id: 'hot-eth', symbol: 'ETH', label: 'Ethereum' }),
  mockHotToken({ id: 'hot-nvda', symbol: 'xyz:NVDA', label: 'NVIDIA' }),
  mockHotToken({ id: 'hot-spacex', symbol: 'xyz:SPCX', label: 'SpaceX' }),
  mockHotToken({ id: 'hot-sol', symbol: 'SOL', label: 'Solana' }),
  mockHotToken({ id: 'hot-hype', symbol: 'HYPE', label: 'Hyperliquid' }),
  mockHotToken({ id: 'hot-tsla', symbol: 'xyz:TSLA', label: 'Tesla' }),
  mockHotToken({ id: 'hot-doge', symbol: 'DOGE', label: 'Dogecoin' }),
  mockHotToken({ id: 'hot-gold', symbol: 'xyz:GOLD', label: 'Gold' }),
];
