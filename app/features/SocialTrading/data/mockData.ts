/**
 * Mock data for the Social Trading prototype.
 *
 * All traders, trades, prices, and returns in this file are fictional and
 * exist only to exercise the prototype UI. Nothing here reflects real
 * accounts, real market data, or real performance.
 *
 * This module acts as the single data boundary for the feature. When the
 * prototype graduates to real services, replace these exports with an
 * adapter backed by the production API while keeping the same types.
 */

export type TradeSide = 'buy' | 'sell';

export interface Trader {
  id: string;
  name: string;
  handle: string;
  address: string;
  verified: boolean;
  /** Win rate, 0-100 */
  winRate: number;
  /** 30-day PnL, percent */
  pnl30d: number;
  followers: number;
  copiers: number;
  aumUsd: number;
  bio: string;
  /** Normalized 0-1 sparkline points */
  perf: number[];
}

export interface Trade {
  id: string;
  traderId: string;
  side: TradeSide;
  tokenSymbol: string;
  tokenName: string;
  amountUsd: number;
  price: number;
  minutesAgo: number;
  /** Simulated live PnL of the position, percent */
  pnlPct: number;
  note?: string;
  likes: number;
  copies: number;
}

export const MOCK_TRADERS: Trader[] = [
  {
    id: 't1',
    name: 'Nova Chen',
    handle: '@novatrades',
    address: '0x9Cbf7c41B7787F6c621115010D3B044029FE2Ce8',
    verified: true,
    winRate: 78,
    pnl30d: 42.6,
    followers: 18400,
    copiers: 2310,
    aumUsd: 1240000,
    bio: 'Momentum on majors, tight stops. I only post trades I actually take.',
    perf: [0.2, 0.35, 0.3, 0.5, 0.45, 0.62, 0.58, 0.8, 0.75, 0.92],
  },
  {
    id: 't2',
    name: 'Marcus Vale',
    handle: '@valemacro',
    address: '0x1f4E7Db8514Ec4E99467a8d2ee3a63094a904e7A',
    verified: true,
    winRate: 64,
    pnl30d: 18.9,
    followers: 9200,
    copiers: 1150,
    aumUsd: 620000,
    bio: 'Macro swing trader. ETH maxi with a rotation habit.',
    perf: [0.4, 0.42, 0.38, 0.5, 0.55, 0.5, 0.6, 0.58, 0.66, 0.7],
  },
  {
    id: 't3',
    name: 'Ivy Ramos',
    handle: '@ivy_onchain',
    address: '0x8a3B7c9d2E4f5A6b8C9d0E1f2A3b4C5d6E7f8A9b',
    verified: false,
    winRate: 71,
    pnl30d: 27.3,
    followers: 6100,
    copiers: 840,
    aumUsd: 310000,
    bio: 'DeFi native. Farming narratives before they trend.',
    perf: [0.3, 0.28, 0.45, 0.4, 0.52, 0.6, 0.55, 0.68, 0.72, 0.78],
  },
  {
    id: 't4',
    name: 'Kenji Sato',
    handle: '@kenji_scalps',
    address: '0x5D2a8E7f3C1b9A0d4E6f8C2a1B3d5E7f9A0c2E4d',
    verified: true,
    winRate: 82,
    pnl30d: 12.4,
    followers: 22700,
    copiers: 3480,
    aumUsd: 2100000,
    bio: 'High win-rate scalper. Small gains, compounded daily.',
    perf: [0.5, 0.52, 0.54, 0.53, 0.58, 0.6, 0.62, 0.61, 0.66, 0.68],
  },
  {
    id: 't5',
    name: 'Sofia Andersson',
    handle: '@sofia_alpha',
    address: '0x3C6e9F1a4B7d0E2f5A8c1D4e7F0a3B6c9D2e5F8a',
    verified: false,
    winRate: 58,
    pnl30d: 64.1,
    followers: 4400,
    copiers: 620,
    aumUsd: 180000,
    bio: 'Asymmetric bets on small caps. High risk, sized accordingly.',
    perf: [0.15, 0.3, 0.22, 0.5, 0.42, 0.35, 0.7, 0.62, 0.85, 0.95],
  },
  {
    id: 't6',
    name: 'Dmitri Volkov',
    handle: '@volkov_waves',
    address: '0x7B0d3F6a9C2e5B8d1F4a7C0e3B6d9F2a5C8e1B4d',
    verified: true,
    winRate: 69,
    pnl30d: 21.7,
    followers: 12800,
    copiers: 1930,
    aumUsd: 890000,
    bio: 'Elliott waves and liquidity zones. Patience pays.',
    perf: [0.35, 0.4, 0.44, 0.42, 0.5, 0.56, 0.52, 0.6, 0.64, 0.7],
  },
];

export const MOCK_TRADES: Trade[] = [
  {
    id: 'tr1',
    traderId: 't1',
    side: 'buy',
    tokenSymbol: 'ETH',
    tokenName: 'Ethereum',
    amountUsd: 24500,
    price: 3841.2,
    minutesAgo: 4,
    pnlPct: 2.4,
    note: 'Reclaimed the range low with volume. Targeting 4k, stop under 3.7k.',
    likes: 214,
    copies: 96,
  },
  {
    id: 'tr2',
    traderId: 't4',
    side: 'sell',
    tokenSymbol: 'SOL',
    tokenName: 'Solana',
    amountUsd: 8900,
    price: 212.55,
    minutesAgo: 12,
    pnlPct: 6.8,
    note: 'Taking profit into resistance. Will rebuy the retest.',
    likes: 158,
    copies: 61,
  },
  {
    id: 'tr3',
    traderId: 't5',
    side: 'buy',
    tokenSymbol: 'ARB',
    tokenName: 'Arbitrum',
    amountUsd: 3200,
    price: 1.18,
    minutesAgo: 26,
    pnlPct: 11.2,
    note: 'Narrative rotation into L2s starting. Small cap sized bet.',
    likes: 342,
    copies: 187,
  },
  {
    id: 'tr4',
    traderId: 't2',
    side: 'buy',
    tokenSymbol: 'LINK',
    tokenName: 'Chainlink',
    amountUsd: 15600,
    price: 22.4,
    minutesAgo: 47,
    pnlPct: -1.3,
    note: 'Accumulating under 23. This one is a multi-week hold.',
    likes: 97,
    copies: 44,
  },
  {
    id: 'tr5',
    traderId: 't3',
    side: 'buy',
    tokenSymbol: 'AAVE',
    tokenName: 'Aave',
    amountUsd: 5400,
    price: 301.7,
    minutesAgo: 73,
    pnlPct: 3.9,
    note: 'Fee switch chatter picking up. DeFi blue chips first.',
    likes: 126,
    copies: 58,
  },
  {
    id: 'tr6',
    traderId: 't6',
    side: 'sell',
    tokenSymbol: 'BTC',
    tokenName: 'Bitcoin',
    amountUsd: 40200,
    price: 97210.0,
    minutesAgo: 95,
    pnlPct: 4.1,
    note: 'Wave 5 exhaustion at the weekly level. De-risking half.',
    likes: 289,
    copies: 132,
  },
  {
    id: 'tr7',
    traderId: 't1',
    side: 'buy',
    tokenSymbol: 'OP',
    tokenName: 'Optimism',
    amountUsd: 7800,
    price: 2.86,
    minutesAgo: 140,
    pnlPct: -2.7,
    note: 'Early entry, wide stop. L2 basket play with ARB.',
    likes: 84,
    copies: 39,
  },
  {
    id: 'tr8',
    traderId: 't4',
    side: 'buy',
    tokenSymbol: 'USDC',
    tokenName: 'USD Coin',
    amountUsd: 52000,
    price: 1.0,
    minutesAgo: 210,
    pnlPct: 0,
    note: 'Rotating to stables into the weekend. Flat is a position.',
    likes: 63,
    copies: 21,
  },
];

export function getTrader(id: string): Trader | undefined {
  return MOCK_TRADERS.find((t) => t.id === id);
}

export function tradesByTrader(traderId: string): Trade[] {
  return MOCK_TRADES.filter((t) => t.traderId === traderId);
}

export function formatUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export function formatMinutesAgo(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export function formatPct(p: number): string {
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(1)}%`;
}
