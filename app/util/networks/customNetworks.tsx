const PopularList = [
	{
		chainId: '43114',
		nickname: 'Avalanche Mainnet C-Chain',
		rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
		ticker: 'AVAX',
		warning: true,
		rpcPrefs: {
			blockExplorerUrl: 'https://snowtrace.io/',
			imageUrl: 'avalanche.svg',
		},
	},
	{
		chainId: '42161',
		nickname: 'Arbitrum One',
		rpcUrl: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
		ticker: 'AETH',
		rpcPrefs: {
			blockExplorerUrl: 'https://explorer.arbitrum.io',
			imageUrl: 'arbitrum.svg',
		},
	},
	{
		chainId: '56',
		nickname: 'Binance Smart Chain Mainnet',
		rpcUrl: 'https://bsc-dataseed1.binance.org/',
		ticker: 'BNB',
		warning: true,
		rpcPrefs: {
			blockExplorerUrl: 'https://bscscan.com/',
			imageUrl: 'binance.svg',
		},
	},
	{
		chainId: '250',
		nickname: 'Fantom Opera',
		rpcUrl: 'https://rpc.ftm.tools/',
		ticker: 'FTM',
		warning: true,
		rpcPrefs: {
			blockExplorerUrl: 'https://ftmscan.com/',
			imageUrl: 'fantom.svg',
		},
	},
	{
		chainId: '1666600000',
		nickname: 'Harmony Mainnet Shard 0',
		rpcUrl: 'https://api.harmony.one/',
		ticker: 'ONE',
		warning: true,
		rpcPrefs: {
			blockExplorerUrl: 'https://explorer.harmony.one/',
			imageUrl: 'harmony.svg',
		},
	},
	{
		chainId: '10',
		nickname: 'Optimism',
		rpcUrl: `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
		ticker: 'ETH',
		rpcPrefs: {
			blockExplorerUrl: 'https://optimistic.etherscan.io/',
			imageUrl: 'optimism.svg',
		},
	},
	{
		chainId: '137',
		nickname: 'Polygon Mainnet',
		rpcUrl: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
		ticker: 'MATIC',
		rpcPrefs: {
			blockExplorerUrl: 'https://polygonscan.com/',
			imageUrl: 'matic.svg',
		},
	},
	{
		chainId: '11297108109',
		nickname: 'Palm',
		rpcUrl: `https://palm-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
		ticker: 'PALM',
		rpcPrefs: {
			blockExplorerUrl: 'https://explorer.palm.io/',
			imageUrl: 'palm.svg',
		},
	},
];

export default PopularList;
