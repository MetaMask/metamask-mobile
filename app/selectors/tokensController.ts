import { createSelector } from 'reselect';
import { TokensControllerState, Token } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { Hex } from '@metamask/utils';

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

export const selectAllDetectedTokensForSelectedAddress = createSelector(
  selectTokensControllerState,
  selectSelectedInternalAccountAddress,
  (tokensControllerState, selectedAddress) => {
    // Updated return type to specify the structure more clearly
    if (!selectedAddress) {
      return {} as { [chainId: Hex]: Token[] }; // Specify return type
    }

    return Object.entries(
      tokensControllerState?.allDetectedTokens || {},
    ).reduce<{
      [chainId: string]: Token[];
    }>((acc, [chainId, chainTokens]) => {
      const tokensForAddress = chainTokens[selectedAddress] || [];
      if (tokensForAddress.length > 0) {
        acc[chainId] = tokensForAddress.map((token: Token) => ({
          ...token,
          chainId,
        }));
      }
      return acc;
    }, {});
  },
);

// TODO: This isn't working fully, once a network has been selected then it
// can detect all tokens in that network. But by default it only shows
// detected tokens if the user has chosen it in the past
export const selectAllDetectedTokensFlat = createSelector(
  selectAllDetectedTokensForSelectedAddress,
  (detectedTokensByChain: { [chainId: string]: Token[] }) => {
    // Updated type here
    if (Object.keys(detectedTokensByChain).length === 0) {
      return [];
    }

    return Object.entries(detectedTokensByChain).reduce<Token[]>(
      (acc, [chainId, addressTokens]) => {
        const tokensForChain = Object.values(addressTokens)
          .flat()
          .map((token) => ({
            ...token,
            chainId,
          }));
        return acc.concat(tokensForChain);
      },
      [],
    );
  },
);
