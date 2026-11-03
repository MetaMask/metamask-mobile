export type GlassDepthMode = 'flat' | 'layered';

export interface GlassDepthToken {
  symbol: string;
  name: string;
  balance: string;
  fiat: string;
  change: string;
  isPositive: boolean;
}

export const GLASS_DEPTH_TOKENS: readonly GlassDepthToken[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    balance: '1.24 ETH',
    fiat: '$3,410.20',
    change: '+1.8%',
    isPositive: true,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    balance: '640 USDC',
    fiat: '$640.00',
    change: '0.0%',
    isPositive: true,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    balance: '8.5 SOL',
    fiat: '$1,020.40',
    change: '-0.6%',
    isPositive: false,
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    balance: '42 LINK',
    fiat: '$209.56',
    change: '+3.1%',
    isPositive: true,
  },
];

export interface GlassDepthNetworkChip {
  label: string;
  /** Tailwind class applied only in the layered treatment. */
  fillClassName: string;
}

/**
 * Color fields meant to scroll under the tab bar. Fills stay off in the flat
 * treatment so the bar samples the page color.
 */
export const GLASS_DEPTH_NETWORKS: readonly GlassDepthNetworkChip[] = [
  { label: 'Ethereum', fillClassName: 'bg-primary-muted' },
  { label: 'Polygon', fillClassName: 'bg-success-muted' },
  { label: 'Arbitrum', fillClassName: 'bg-warning-muted' },
  { label: 'Base', fillClassName: 'bg-error-muted' },
];

export const GLASS_DEPTH_TEST_IDS = {
  SCREEN: 'glass-depth-screen',
  ACCENT: 'glass-depth-accent',
  BALANCE_CARD: 'glass-depth-balance-card',
  TOKEN_CARD: 'glass-depth-token-card',
  TOKEN_LIST: 'glass-depth-token-list',
  TAB_BAR: 'glass-depth-tab-bar',
  NOTE: 'glass-depth-note',
} as const;
