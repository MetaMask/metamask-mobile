import { createSelector } from 'reselect';
import { TokensState, Token } from '@metamask/assets-controllers';
import { EngineState } from './types';

const selectTokensControllerState = (state: EngineState) =>
  state?.engine?.backgroundState?.TokensController;

export const selectTokens = createSelector(
  selectTokensControllerState,
  (tokensControllerState: TokensState) => tokensControllerState?.tokens,
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
  (tokensControllerState: TokensState) => tokensControllerState?.ignoredTokens,
);

export const selectDetectedTokens = createSelector(
  selectTokensControllerState,
  (tokensControllerState: TokensState) => tokensControllerState?.detectedTokens,
);
