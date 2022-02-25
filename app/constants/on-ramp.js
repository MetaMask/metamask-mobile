/**
 * @enum {string}
 */
export const FIAT_ORDER_PROVIDERS = {
	WYRE: 'WYRE',
	WYRE_APPLE_PAY: 'WYRE_APPLE_PAY',
	TRANSAK: 'TRANSAK',
	MOONPAY: 'MOONPAY',
};

/**
 * @enum {string}
 */
export const FIAT_ORDER_STATES = {
	PENDING: 'PENDING',
	FAILED: 'FAILED',
	COMPLETED: 'COMPLETED',
	CANCELLED: 'CANCELLED',
};

/**
 * @enum {string}
 */
export const PAYMENT_RAILS = {
	APPLE_PAY: 'Apple Pay',
	MULTIPLE: 'Multiple Options',
};

/**
 * @enum {string}
 */
export const PAYMENT_CATEGORY = {
	CARD_PAYMENT: 'Card Payment',
	BANK_TRANSFER: 'Bank Transfer',
	MULTIPLE: 'Multiple Options',
};

/**
 * @enum {string}
 */

export const NETWORKS_CHAIN_ID = {
	MAINNET: '1',
	KOVAN: '42',
	BSC: '56',
	POLYGON: '137',
	AVAXCCHAIN: '43114',
	CELO: '42220',
	FANTOM: '250',
};

const TRANSAK_NETWORK_NAMES = {
	[NETWORKS_CHAIN_ID.MAINNET]: 'ethereum',
	[NETWORKS_CHAIN_ID.BSC]: 'bsc',
	[NETWORKS_CHAIN_ID.POLYGON]: 'polygon',
	[NETWORKS_CHAIN_ID.AVAXCCHAIN]: 'avaxcchain',
	[NETWORKS_CHAIN_ID.CELO]: 'celo',
	[NETWORKS_CHAIN_ID.FANTOM]: 'fantom',
};

export const NETWORK_NATIVE_SYMBOL = {
	[NETWORKS_CHAIN_ID.MAINNET]: 'ETH',
	[NETWORKS_CHAIN_ID.BSC]: 'BNB',
	[NETWORKS_CHAIN_ID.POLYGON]: 'MATIC',
	[NETWORKS_CHAIN_ID.AVAXCCHAIN]: 'AVAX',
	[NETWORKS_CHAIN_ID.CELO]: 'CELO',
	[NETWORKS_CHAIN_ID.FANTOM]: 'FTM',
};

export const NETWORK_ALLOWED_TOKENS = {
	[NETWORKS_CHAIN_ID.MAINNET]: [
		{ symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
		{ symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
		{ symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18 },
	],
	[NETWORKS_CHAIN_ID.BSC]: [{ symbol: 'BUSD', address: '0xe9e7cea3dedca5984780bafc599bd69add087d56', decimals: 18 }],
	[NETWORKS_CHAIN_ID.POLYGON]: [
		{ symbol: 'USDT', address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', decimals: 6 },
		{ symbol: 'USDC', address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', decimals: 6 },
		{ symbol: 'DAI', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 },
	],
};

export const TRANSAK_NETWORK_PARAMETERS = Object.keys(TRANSAK_NETWORK_NAMES).reduce(
	(acc, key) => ({
		...acc,
		[key]: [
			TRANSAK_NETWORK_NAMES[key],
			NETWORK_NATIVE_SYMBOL[key],
			[NETWORK_NATIVE_SYMBOL[key], ...(NETWORK_ALLOWED_TOKENS[key] || []).map(({ symbol }) => symbol)].join(','),
		],
	}),
	{}
);
