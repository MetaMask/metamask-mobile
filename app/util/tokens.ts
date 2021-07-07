import { Token } from '@metamask/controllers';

/**
 * Convert token list object to token list array
 */
export const tokenListToArray = (tokenList: { [key: string]: Token }) => {
	return Object.entries(tokenList as {
		[address: string]: Token;
	}).map(([address, tokenData]) => {
		tokenData.address = address;
		return tokenData;
	});
};
