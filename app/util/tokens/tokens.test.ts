import { tokenListToArray } from './';
// TODO: Placeholder for incoming Token type from TokenListController
// TokenListController needs to export this type for us to import and use
type Token = any;

const token: Token = {
	address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
	symbol: 'WBTC',
	decimals: 8,
	occurances: 12,
	aggregators: [
		'airswapLight',
		'bancor',
		'cmc',
		'coinGecko',
		'kleros',
		'oneInch',
		'paraswap',
		'pmm',
		'totle',
		'zapper',
		'zerion',
		'zeroEx'
	],
	iconUrl: 'https://s3.amazonaws.com/airswap-token-images/WBTC.png'
};
const tokenListObject: { [address: string]: Token } = {
	'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': token
};

describe('Token utils :: tokenListToArray', () => {
	it('should reduce object into array', () => {
		const tokenListArray = tokenListToArray(tokenListObject);
		expect(tokenListArray).toBe([token]);
	});
});
