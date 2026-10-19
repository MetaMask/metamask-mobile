import type { BridgeToken } from '../types';

const ONDO_TOKENIZED_TOKEN_NAME = 'Ondo Tokenized';

type RwaFilterableToken = Pick<BridgeToken, 'name' | 'rwaData'>;

/**
 * Removes real-world asset tokens from a token list.
 *
 * Ondo Tokenized assets are matched by name because they are not always
 * accompanied by `rwaData`.
 */
export const filterOutRwaTokens = <Token extends RwaFilterableToken>(
  tokens: readonly Token[],
): Token[] =>
  tokens.filter(
    (token) =>
      !token.rwaData && !token.name?.includes(ONDO_TOKENIZED_TOKEN_NAME),
  );
