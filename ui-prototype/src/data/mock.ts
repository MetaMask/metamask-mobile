export type TabId = 'home' | 'explore' | 'trade' | 'money' | 'rewards';

export const ACTIONS = [
  { id: 'swap', label: 'Swap', icon: 'swap_horiz' },
  { id: 'perps', label: 'Perps', icon: 'candlestick_chart' },
  { id: 'predict', label: 'Predict', icon: 'emoji_events' },
  { id: 'traders', label: 'Traders', icon: 'group' },
  { id: 'buy', label: 'Buy', icon: 'add' },
  { id: 'sell', label: 'Sell', icon: 'remove' },
  { id: 'send', label: 'Send', icon: 'north_east' },
  { id: 'receive', label: 'Receive', icon: 'south_west' },
] as const;

export const TOKENS = [
  {
    symbol: 'WSOL',
    name: 'Wrapped SOL',
    amount: '0.01818 WSOL',
    fiat: '$1.34',
    price: '$73.62',
    change: '+0.33%',
    up: true,
    color: '#14F195',
    verified: true,
    icon: 'bolt',
  },
  {
    symbol: 'stETH',
    name: 'Staked Ethereum',
    amount: '0.00052 stETH',
    fiat: '$1.22',
    price: '$2,334.10',
    change: '+0.41%',
    up: true,
    color: '#00A3FF',
    verified: true,
    icon: 'token',
  },
  {
    symbol: 'SAFE',
    name: 'Safe Token',
    amount: '8.10274 SAFE',
    fiat: '$0.76',
    price: '$0.09',
    change: '-0.58%',
    up: false,
    color: '#12A19A',
    verified: true,
    icon: 'shield',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    amount: '0.00084 ETH',
    fiat: '$1.96',
    price: '$2,334.10',
    change: '+0.41%',
    up: true,
    color: '#627EEA',
    verified: true,
    icon: 'token',
  },
] as const;

export type TokenSymbol = (typeof TOKENS)[number]['symbol'];

export const CHART_PERIODS = ['1D', '1W', '1M', '3M', '1Y', '3Y'] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

/** Mock sparkline series (normalized 0–1) + display price for asset details. */
export const TOKEN_CHART: Record<
  TokenSymbol,
  {
    price: string;
    absoluteChange: string;
    percentChange: string;
    periodLabel: string;
    up: boolean;
    series: number[];
  }
> = {
  WSOL: {
    price: '$73.62',
    absoluteChange: '+$0.24',
    percentChange: '+0.33%',
    periodLabel: 'Today',
    up: true,
    series: [
      0.42, 0.38, 0.55, 0.48, 0.62, 0.58, 0.71, 0.66, 0.78, 0.72, 0.85, 0.8,
      0.88,
    ],
  },
  stETH: {
    price: '$2,334.10',
    absoluteChange: '+$9.52',
    percentChange: '+0.41%',
    periodLabel: 'Today',
    up: true,
    series: [
      0.35, 0.4, 0.38, 0.52, 0.48, 0.61, 0.55, 0.68, 0.72, 0.65, 0.78, 0.82,
      0.88,
    ],
  },
  SAFE: {
    price: '$0.0934',
    absoluteChange: '-$0.0005',
    percentChange: '-0.58%',
    periodLabel: 'Today',
    up: false,
    series: [
      0.62, 0.48, 0.55, 0.72, 0.58, 0.45, 0.68, 0.52, 0.38, 0.55, 0.78, 0.62,
      0.48, 0.35, 0.58, 0.72, 0.55, 0.42, 0.5, 0.38, 0.45, 0.52, 0.48,
    ],
  },
  ETH: {
    price: '$2,334.10',
    absoluteChange: '+$9.52',
    percentChange: '+0.41%',
    periodLabel: 'Today',
    up: true,
    series: [
      0.3, 0.45, 0.4, 0.58, 0.52, 0.65, 0.6, 0.74, 0.7, 0.82, 0.78, 0.88, 0.92,
    ],
  },
};

export const TOKEN_DETAILS: Record<
  TokenSymbol,
  {
    network: string;
    contractAddress: string;
    tokenDecimal: number;
    tokenList: string;
    marketCap: string;
    totalVolume: string;
    volumeToMarketCap: string;
    circulatingSupply: string;
    allTimeHigh: string;
    allTimeLow: string;
    fullyDiluted: string;
    about: string;
    securityStatus: 'Verified' | 'Unverified';
  }
> = {
  WSOL: {
    network: 'Solana',
    contractAddress: 'So11…1112',
    tokenDecimal: 9,
    tokenList: 'MetaMask',
    marketCap: '$35.2B',
    totalVolume: '$2.1B',
    volumeToMarketCap: '5.97%',
    circulatingSupply: '478.2M',
    allTimeHigh: '$294.33',
    allTimeLow: '$8.11',
    fullyDiluted: '$35.2B',
    about:
      'Wrapped SOL lets you use Solana’s native asset in token standards that expect an SPL token.',
    securityStatus: 'Verified',
  },
  stETH: {
    network: 'Ethereum',
    contractAddress: '0xae7…a2fa',
    tokenDecimal: 18,
    tokenList: 'MetaMask',
    marketCap: '$22.4B',
    totalVolume: '$89.2M',
    volumeToMarketCap: '0.40%',
    circulatingSupply: '9.6M',
    allTimeHigh: '$4,829.57',
    allTimeLow: '$482.90',
    fullyDiluted: '$22.4B',
    about:
      'stETH is Lido’s liquid staking token, representing staked ETH plus staking rewards.',
    securityStatus: 'Verified',
  },
  SAFE: {
    network: 'Ethereum',
    contractAddress: '0x5aFE3...1eEEe',
    tokenDecimal: 18,
    tokenList: 'MetaMask',
    marketCap: '$71.52M',
    totalVolume: '$1.13M',
    volumeToMarketCap: '1.59%',
    circulatingSupply: '767.45M',
    allTimeHigh: '$3.56',
    allTimeLow: '$0.08',
    fullyDiluted: '$93.19M',
    about:
      'SAFE is the governance token of Safe, the leading onchain smart account platform used to secure digital assets.',
    securityStatus: 'Verified',
  },
  ETH: {
    network: 'Ethereum',
    contractAddress: 'Native',
    tokenDecimal: 18,
    tokenList: 'MetaMask',
    marketCap: '$281.5B',
    totalVolume: '$12.4B',
    volumeToMarketCap: '4.40%',
    circulatingSupply: '120.5M',
    allTimeHigh: '$4,891.70',
    allTimeLow: '$0.42',
    fullyDiluted: '$281.5B',
    about:
      'Ether is the native currency of Ethereum, used to pay for transaction fees and secure the network.',
    securityStatus: 'Verified',
  },
};

export const PERPETUALS_SUMMARY = {
  pnl: '+$0.19',
  pnlPercent: '(+32.7%)',
  up: true,
} as const;

export const PERPETUALS = [
  {
    id: 'btc-long',
    title: 'BTC 3x long',
    amount: '0.00015 BTC',
    fiat: '$9.75',
    pnl: '-$1.81 (-47.0%)',
    up: false,
    color: '#F7931A',
    icon: 'currency_bitcoin',
  },
  {
    id: 'eth-short',
    title: 'ETH 3x short',
    amount: '0.0042 ETH',
    fiat: '$8.03',
    pnl: '+$2.00 (+59.8%)',
    up: true,
    color: '#627EEA',
    icon: 'token',
  },
] as const;

export const PREDICTIONS = [
  {
    id: 'btc-price',
    title: 'BTC Price: $64,953',
    subtitle: 'Price to beat: $64,929',
    icon: 'currency_bitcoin' as const,
    live: 'Live 01:53',
  },
  {
    id: 'epl',
    title: 'EPL: 2027 Champion',
    subtitle: '38% chance on Arsenal',
    icon: 'emoji_events' as const,
  },
  {
    id: 'nba',
    title: 'NBA: 2027 Champion',
    subtitle: '22% chance on Oklahoma City Thunder',
    icon: 'emoji_events' as const,
  },
] as const;

export const WATCHLIST = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: '$64,953',
    change: '+1.24%',
    up: true,
    color: '#F7931A',
    icon: 'currency_bitcoin',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    price: '$148.20',
    change: '-0.82%',
    up: false,
    color: '#14F195',
    icon: 'bolt',
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    price: '$13.45',
    change: '+2.10%',
    up: true,
    color: '#2A5ADA',
    icon: 'link',
  },
] as const;

export const DEFI_POSITIONS = [
  {
    id: 'mm-swaps',
    name: 'MetaMask Swaps',
    subtitle: 'ETH only',
    fiat: '$0.90',
    color: '#E2761B',
    icon: 'currency_exchange',
    badge: 'eth' as const,
    trailing: 'eth' as const,
  },
  {
    id: 'aave-v3',
    name: 'Aave V3',
    subtitle: 'USDT only',
    fiat: '<$0.01',
    color: '#B6509E',
    icon: 'account_balance',
    badge: 'eth' as const,
    trailing: 'usdt' as const,
  },
] as const;

export const NFTS = [
  {
    id: 'hyper-sauce',
    title: 'Hyper Sauce',
    collection: 'Liquid Frames',
    label: '',
    // muted purple
    tone: 'linear-gradient(145deg, #3a3248 0%, #2a2438 55%, #16121e 100%)',
  },
  {
    id: 'dissected-1',
    title: 'Dissected Sm…',
    collection: 'Smoke',
    label: '',
    // sage green (#a1b68b)
    tone: 'linear-gradient(160deg, #3a4234 0%, #262c24 50%, #141814 100%)',
  },
  {
    id: 'interlinea',
    title: 'Interlinea #45',
    collection: 'Interlinea',
    label: '',
    // soft sky / steel blue (#80a0a8)
    tone: 'linear-gradient(135deg, #2e3a42 0%, #222830 50%, #12161a 100%)',
  },
  {
    id: 'dissected-2',
    title: 'Dissected Sm…',
    collection: 'Smoke',
    label: '',
    // muted peach (#dfc3ae)
    tone: 'linear-gradient(150deg, #4a3c34 0%, #2e2622 50%, #161412 100%)',
  },
  {
    id: 'amber-field',
    title: 'Amber Field',
    collection: 'Haze',
    label: '',
    // muted yellow
    tone: 'linear-gradient(150deg, #4a4228 0%, #2e2a1a 50%, #16140e 100%)',
  },
] as const;

export const ACTIVITY = [
  {
    id: '1',
    title: 'Sent ETH',
    subtitle: 'To 0x8f…3a2c',
    amount: '-0.12 ETH',
    fiat: '-$394.20',
    time: '2h ago',
    type: 'send' as const,
  },
  {
    id: '2',
    title: 'Received USDC',
    subtitle: 'From Alice.eth',
    amount: '+250 USDC',
    fiat: '+$250.00',
    time: 'Yesterday',
    type: 'receive' as const,
  },
  {
    id: '3',
    title: 'Swapped',
    subtitle: 'ETH → SOL',
    amount: '0.5 ETH',
    fiat: '→ 16.2 SOL',
    time: 'Mon',
    type: 'swap' as const,
  },
] as const;

export const DAPP_SHORTCUTS = [
  { name: 'Uniswap', host: 'app.uniswap.org', hue: 220 },
  { name: 'Aave', host: 'app.aave.com', hue: 280 },
  { name: 'OpenSea', host: 'opensea.io', hue: 190 },
  { name: 'Lens', host: 'hey.xyz', hue: 150 },
] as const;
