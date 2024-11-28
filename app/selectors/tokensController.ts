import { createSelector } from 'reselect';
import { TokensControllerState, Token } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

const selectTokensControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.TokensController;

export const selectTokens = createDeepEqualSelector(
  selectTokensControllerState,
  (tokensControllerState: TokensControllerState) =>
    tokensControllerState?.tokens,
);

export const selectTokensByAddress = createSelector(
  selectTokens,
  (tokens: Token[]) =>
    tokens.reduce((tokensMap: { [address: string]: Token }, token: Token) => {
      tokensMap[token.address] = token;
      return tokensMap;
    }, {}),
);

export const selectTokensLength = createSelector(
  selectTokens,
  (tokens: Token[]) => tokens.length,
);

export const selectIgnoreTokens = createSelector(
  selectTokensControllerState,
  (tokensControllerState: TokensControllerState) =>
    tokensControllerState?.ignoredTokens,
);

export const selectDetectedTokens = createSelector(
  selectTokensControllerState,
  (tokensControllerState: TokensControllerState) =>
    tokensControllerState?.detectedTokens,
);

const selectAllTokens = createSelector(
  selectTokensControllerState,
  (tokensControllerState: TokensControllerState) =>
    tokensControllerState?.allTokens,
);

export const selectAllTokensFlat = createSelector(
  selectAllTokens,
  (tokensByAccountByChain) => {
    if (Object.values(tokensByAccountByChain).length === 0) {
      return [];
    }
    const tokensByAccountArray = Object.values(tokensByAccountByChain);

    return tokensByAccountArray.reduce((acc, tokensByAccount) => {
      const tokensArray = Object.values(tokensByAccount);
      return acc.concat(...tokensArray);
    }, [] as Token[]);
  },
);
