import type { TokenI } from '../../Tokens/types';

export type TronNativeToken = TokenI & {
  chainId: `tron:${string}`;
  ticker: 'TRX';
};

export const isTronNativeToken = (token: TokenI): token is TronNativeToken =>
  token.ticker === 'TRX' && String(token.chainId).startsWith('tron:');
