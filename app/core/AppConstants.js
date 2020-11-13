import Device from '../util/Device';

export default {
	DEFAULT_LOCK_TIMEOUT: 30000,
	DEFAULT_SEARCH_ENGINE: 'DuckDuckGo',
	TX_CHECK_MAX_FREQUENCY: 5000,
	TX_CHECK_NORMAL_FREQUENCY: 10000,
	TX_CHECK_BACKGROUND_FREQUENCY: 30000,
	IPFS_OVERRIDE_PARAM: 'mm_override',
	IPFS_DEFAULT_GATEWAY_URL: 'https://cloudflare-ipfs.com/ipfs/',
	IPNS_DEFAULT_GATEWAY_URL: 'https://cloudflare-ipfs.com/ipns/',
	SWARM_DEFAULT_GATEWAY_URL: 'https://swarm-gateways.net/bzz:/',
	supportedTLDs: ['eth', 'xyz', 'test'],
	MAX_PUSH_NOTIFICATION_PROMPT_TIMES: 2,
	CONNEXT: {
		HUB_EXCHANGE_CEILING_TOKEN: 69,
		MIN_DEPOSIT_ETH: 0.03,
		MAX_DEPOSIT_TOKEN: 30,
		BLOCKED_DEPOSIT_DURATION_MINUTES: 5,
		CONTRACTS: {
			4: '0x0Fa90eC3AC3245112c6955d8F9DD74Ec9D599996',
			1: '0xdfa6edAe2EC0cF1d4A60542422724A48195A5071'
		},
		SUPPORTED_NETWORKS: ['mainnet', 'rinkeby']
	},
	MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
	SAI_ADDRESS: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
	HOMEPAGE_URL: 'https://home.metamask.io/',
	ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
	INSTAPAY_GAS_PONDERATOR: 1.2,
	USER_AGENT: Device.isAndroid()
		? 'Mozilla/5.0 (Linux; Android 10; Android SDK built for x86 Build/OSM1.180201.023) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.92 Mobile Safari/537.36'
		: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/76.0.3809.123 Mobile/15E148 Safari/605.1',
	NOTIFICATION_NAMES: {
		accountsChanged: 'wallet_accountsChanged'
	},
	FIAT_ORDERS: {
		TRANSAK_URL: 'https://global.transak.com/',
		TRANSAK_URL_STAGING: 'https://staging-global.transak.com/',
		TRANSAK_API_URL_PRODUCTION: 'https://api.transak.com/',
		TRANSAK_API_URL_STAGING: 'https://staging-api.transak.com/',
		TRANSAK_REDIRECT_URL: 'https://metamask.io/',
		WYRE_API_ENDPOINT: 'https://api.sendwyre.com/',
		WYRE_API_ENDPOINT_TEST: 'https://api.testwyre.com/',
		WYRE_MERCHANT_ID: 'merchant.io.metamask.wyre',
		WYRE_MERCHANT_ID_TEST: 'merchant.io.metamask.wyre.test',
		POLLING_FREQUENCY: 10000
	},
	DEEPLINKS: {
		ORIGIN_DEEPLINK: 'deeplink',
		ORIGIN_QR_CODE: 'qr-code'
	},
	SWAPS: {
		ACTIVE: false
	}
};
