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
  imageUrl:
    'https://arweave.net/VQrPjACwnQRmxdKBTqNwPiyo65x7LAT773t8Kd7YBzw',
};

export const CROSSMINT_USD_AMOUNT_PRESETS = ['5', '20', '50'] as const;

export const CROSSMINT_DEFAULT_MAX_SLIPPAGE_BPS = '500';

/** Solana mainnet CAIP-2 chain id used by MetaMask Multichain accounts. */
export const SOLANA_MAINNET_CAIP_CHAIN_ID =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;

export const CROSSMINT_CHECKOUT_SDK_PATH = '/sdk/2024-03-05/embedded-checkout';

export const CROSSMINT_TOKENS_API_PATH = '/api/2024-09-26/tokens';

export const CROSSMINT_ORDERS_API_PATH = '/api/2022-06-09/orders';
