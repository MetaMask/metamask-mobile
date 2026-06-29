///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { XlmScope } from '@metamask/keyring-api';
import type { TokenI } from '../../Tokens/types';

export type StellarNativeToken = TokenI & {
  chainId: `${typeof XlmScope.Pubnet}` | `${typeof XlmScope.Testnet}`;
  isNative: true;
};

export const isStellarNativeToken = (
  token: TokenI,
): token is StellarNativeToken =>
  Boolean(token.isNative) && String(token.chainId).startsWith('stellar:');

export const getStellarNativeDisplayName = (token: TokenI): string =>
  token.symbol || 'XLM';
///: END:ONLY_INCLUDE_IF
