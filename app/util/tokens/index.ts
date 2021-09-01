import { TokenListMap } from '@metamask/controllers';

/**
 * Convert token list object to token list array
 */
export const tokenListToArray = (tokenList: TokenListMap) => {
	return Object.entries(tokenList).map(([address, tokenData]) => {
		// TODO: Have the TokenListController return the same Token type regardless of static or dynamic
		// We need to set the token address here since static token list will not supply it by default
		tokenData.address = address;
		return tokenData;
	});
};
