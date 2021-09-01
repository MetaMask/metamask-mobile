import { TokenListMap } from '@metamask/controllers';

/**
 * Convert token list object to token list array
 */
export const tokenListToArray = (tokenList: TokenListMap) => {
	return Object.values(tokenList).map(tokenData => tokenData);
};
