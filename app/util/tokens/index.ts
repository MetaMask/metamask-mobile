import { TokenListMap } from '@metamask/assets-controllers';

/**
 * Convert token list object to token list array
 */
export const tokenListToArray = (tokenList: TokenListMap) =>
  Object.values(tokenList).map((tokenData) => tokenData);

/**
 * Compare two collectible token ids from.
 *
 * @param unknownTokenId - Collectible token ID with unknow data type.
 * @param stringTokenId - Collectible token ID as string.
 * @returns Boolean indicationg if the ID is the same.
 */
export const compareTokenIds = (
  unknownTokenId: number | string,
  stringTokenId: string,
): boolean => {
  if (typeof unknownTokenId === 'number') {
    return String(unknownTokenId) === stringTokenId;
  }
  return unknownTokenId === stringTokenId;
};
