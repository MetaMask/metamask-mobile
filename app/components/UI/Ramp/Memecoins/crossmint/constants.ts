import type { CrossmintMemecoinToken } from './types';

/** Staging Solana XMEME token used by Crossmint memecoin quickstarts. */
export const CROSSMINT_STAGING_XMEME_LOCATOR =
  'solana:7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu';

export const CROSSMINT_STAGING_XMEME_TOKEN: CrossmintMemecoinToken = {
  tokenLocator: CROSSMINT_STAGING_XMEME_LOCATOR,
  chain: 'solana',
  address: '7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu',
  available: true,
  creditCardPayment: true,
  name: 'XMEME',
  symbol: 'XMEME',
  imageUrl: 'https://arweave.net/VQrPjACwnQRmxdKBTqNwPiyo65x7LAT773t8Kd7YBzw',
};

/**
 * MetaMask Price API returns `null` for Crossmint's staging XMEME mint (it is
 * not indexed). Use this demo market data so the Memecoins list can still show
 * price / 24h % in staging. Real catalog tokens use live Price API values.
 */
export const CROSSMINT_STAGING_XMEME_MARKET_DATA = {
  price: 0.000042,
  priceChange1d: 12.34,
  marketCap: 1_250_000,
} as const;

/**
 * Well-known Solana memecoins appended to the catalog so the list can show live
 * MetaMask Price API market data while Crossmint `GET /tokens` is limited.
 * Checkout for these may fail on staging (prod locators); use XMEME to buy.
 */
export const DEMO_MEMECOIN_CATALOG_STUBS: CrossmintMemecoinToken[] = [
  {
    tokenLocator: 'solana:6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
    chain: 'solana',
    address: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
    available: true,
    creditCardPayment: true,
    name: 'Official Trump',
    symbol: 'TRUMP',
    imageUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN.png',
  },
  {
    tokenLocator: 'solana:2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
    chain: 'solana',
    address: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
    available: true,
    creditCardPayment: true,
    name: 'Pudgy Penguins',
    symbol: 'PENGU',
    imageUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv.png',
  },
  {
    tokenLocator: 'solana:9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
    chain: 'solana',
    address: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
    available: true,
    creditCardPayment: true,
    name: 'Fartcoin',
    symbol: 'FARTCOIN',
    imageUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump.png',
  },
];

export const CROSSMINT_USD_AMOUNT_PRESETS = [
  '50',
  '100',
  '500',
  '1500',
] as const;

export const CROSSMINT_DEFAULT_MAX_SLIPPAGE_BPS = '500';

/** Solana mainnet CAIP-2 chain id used by MetaMask Multichain accounts. */
export const SOLANA_MAINNET_CAIP_CHAIN_ID =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;

export const CROSSMINT_CHECKOUT_SDK_PATH = '/sdk/2024-03-05/embedded-checkout';

export const CROSSMINT_TOKENS_API_PATH = '/api/2024-09-26/tokens';

export const CROSSMINT_ORDERS_API_PATH = '/api/2022-06-09/orders';
