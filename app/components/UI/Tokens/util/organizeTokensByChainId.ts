import { TokenI } from '../types';

/**
 * Organizes an array of tokens into groups by chainId
 * @param tokens Array of tokens to organize
 * @returns Object with chainId keys and arrays of tokens as values
 */
export const organizeTokensByChainId = (
  tokens: TokenI[],
): { [chainId: string]: TokenI[] } =>
  tokens.reduce<{ [chainId: string]: TokenI[] }>((acc, token) => {
    if (!token.chainId) {
      return acc;
    }

    if (!acc[token.chainId]) {
      acc[token.chainId] = [];
    }

    acc[token.chainId].push(token);

    return acc;
  }, {});
