import { Hex } from '@metamask/utils';
import { BridgeToken } from '../../Bridge/types';

/**
 * Returns the token with the highest fiat value from a list of tokens.
 *
 * @param {BridgeToken[]} tokens - Array of tokens to evaluate.
 * @returns {BridgeToken | null} The token with the highest `tokenFiatAmount`, or null if the list is empty.
 */
export function getHighestFiatToken(
  tokens: BridgeToken[],
  priorityTokenAddress: Hex,
): BridgeToken | undefined {
  if (!tokens.length) return undefined;

  const tokensWithoutPriority = tokens.filter(
    (token) =>
      token.address.toLowerCase() !== priorityTokenAddress.toLowerCase(),
  );

  if (tokensWithoutPriority.length === 0) return undefined;

  return tokensWithoutPriority.reduce<BridgeToken | undefined>(
    (maxToken, current) => {
      const currentFiat = current.tokenFiatAmount ?? 0;
      const maxFiat = maxToken?.tokenFiatAmount ?? 0;
      return currentFiat > maxFiat ? current : maxToken;
    },
    undefined,
  );
}
