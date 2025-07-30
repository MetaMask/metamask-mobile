import { Hex } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';

type TokenIWithTokenFiatAmount = TokenI & {
  tokenFiatAmount: number | undefined;
};

/**
 * Returns the token with the highest fiat value from a list of tokens.
 *
 * @param {TokenI[]} tokens - Array of tokens to evaluate.
 * @returns {TokenI | null} The token with the highest `tokenFiatAmount`, or null if the list is empty.
 */
export function getHighestFiatToken(
  tokens: TokenIWithTokenFiatAmount[],
  priorityTokenAddress: Hex,
): TokenI | null {
  if (!tokens.length) return null;

  const tokensWithoutPriority = tokens.filter(
    (token) =>
      token.address.toLowerCase() !== priorityTokenAddress.toLowerCase(),
  );

  if (tokensWithoutPriority.length === 0) return null;

  return tokensWithoutPriority.reduce<TokenIWithTokenFiatAmount | null>(
    (maxToken, current) => {
      const currentFiat = current.tokenFiatAmount ?? 0;
      const maxFiat = maxToken?.tokenFiatAmount ?? 0;
      return currentFiat > maxFiat ? current : maxToken;
    },
    null,
  );
}
