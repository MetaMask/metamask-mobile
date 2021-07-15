// TODO: Placeholder for incoming Token type from TokenListController
// TokenListController needs to export this type for us to import and use
type Token = any;

/**
 * Convert token list object to token list array
 */
export const tokenListToArray = (tokenList: { [key: string]: Token }) => {
	return Object.entries(tokenList).map(([address, tokenData]) => {
		// TODO: Have the TokenListController return the same Token type regardless of static or dynamic
		// We need to set the token address here since static token list will not supply it by default
		tokenData.address = address;
		return tokenData;
	});
};
