import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import {
  TokenListState,
  TokenRatesControllerState,
  TokensControllerState,
} from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import { isHexString } from 'ethereumjs-util';

/**
 * This migration is to address the users that were impacted by the tokens missing on their wallet
 * Because the chain id was not migrated to hexadecimal format
 * And still didn't import the tokens again
 * @param state
 * @returns
 */
export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;

  if (!isObject(state)) {
    captureException(
      new Error(`Migration 31: Invalid state: '${typeof state}'`),
    );
    // Force vault corruption if state is completely corrupt
    return {};
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(`Migration 31: Invalid engine state: '${typeof state.engine}'`),
    );
    // Force vault corruption if state is completely corrupt
    const { engine, ...restState } = state;
    return restState;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 31: Invalid engine backgroundState: '${typeof state.engine
          .backgroundState}'`,
      ),
    );
    const { engine, ...restState } = state;
    return restState;
  }

  const tokenListControllerState =
    state?.engine?.backgroundState?.TokenListController;
  const newTokenListControllerState = state?.engine?.backgroundState
    ?.TokenListController as TokenListState;

  if (!isObject(tokenListControllerState)) {
    captureException(
      new Error(
        `Migration 31: Invalid TokenListController state: '${JSON.stringify(
          tokenListControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(tokenListControllerState, 'tokensChainsCache') ||
    !isObject(tokenListControllerState.tokensChainsCache)
  ) {
    captureException(
      new Error(
        `Migration 31: Invalid tokenListControllerState tokensChainsCache: '${JSON.stringify(
          tokenListControllerState.tokensChainsCache,
        )}'`,
      ),
    );
    return state;
  }

  if (Object.keys(tokenListControllerState.tokensChainsCache).length) {
    Object.keys(tokenListControllerState.tokensChainsCache).forEach(
      (chainId) => {
        if (!isHexString(chainId)) {
          const hexChainId = toHex(chainId);

          if (
            !Object.prototype.hasOwnProperty.call(
              newTokenListControllerState.tokensChainsCache,
              hexChainId,
            )
          ) {
            newTokenListControllerState.tokensChainsCache[hexChainId] =
              //@ts-expect-error Is verified on Line 508 that tokenChainsCache is a property
              tokenListControllerState.tokensChainsCache[chainId];
          }

          if (isObject(tokenListControllerState.tokensChainsCache)) {
            delete tokenListControllerState.tokensChainsCache[chainId];
          }
        }
      },
    );
  }

  const tokenRatesControllerState =
    state?.engine?.backgroundState?.TokenRatesController;
  const newTokenRatesControllerState = state?.engine?.backgroundState
    ?.TokenRatesController as TokenRatesControllerState;

  if (!isObject(tokenRatesControllerState)) {
    captureException(
      new Error(
        `Migration 31: Invalid TokenRatesController state: '${JSON.stringify(
          tokenRatesControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    isObject(tokenRatesControllerState.contractExchangeRatesByChainId) &&
    Object.keys(tokenRatesControllerState.contractExchangeRatesByChainId).length
  ) {
    Object.keys(
      tokenRatesControllerState.contractExchangeRatesByChainId,
    ).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);

        if (
          !Object.prototype.hasOwnProperty.call(
            //@ts-expect-error At the time of that migrations assets controllers version had those properties, so those users will have that property on their phone storage, the migration was casted and that where it's wrong, we shouldn't cast migrations because the structure and property names change over time.
            newTokenRatesControllerState.contractExchangeRatesByChainId,
            hexChainId,
          )
        ) {
          //@ts-expect-error At the time of that migrations assets controllers version had those properties, so those users will have that property on their phone storage, the migration was casted and that where it's wrong, we shouldn't cast migrations because the structure and property names change over time.
          newTokenRatesControllerState.contractExchangeRatesByChainId[
            hexChainId
          ] =
            //@ts-expect-error Is verified on Line 558 that contractExchangeRatesByChainId is a property
            tokenRatesControllerState.contractExchangeRatesByChainId[chainId];
        }

        if (
          isObject(tokenRatesControllerState.contractExchangeRatesByChainId)
        ) {
          delete tokenRatesControllerState.contractExchangeRatesByChainId[
            chainId
          ];
        }
      }
    });
  }

  const tokensControllerState =
    state?.engine?.backgroundState?.TokensController;
  const newTokensControllerState = state?.engine?.backgroundState
    ?.TokensController as TokensControllerState;

  if (!isObject(tokensControllerState)) {
    captureException(
      new Error(
        `Migration 31: Invalid TokensController state: '${JSON.stringify(
          tokensControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(tokensControllerState, 'allTokens') ||
    !isObject(tokensControllerState.allTokens)
  ) {
    captureException(
      new Error(
        `Migration 31: Invalid TokensController allTokens: '${JSON.stringify(
          tokensControllerState.allTokens,
        )}'`,
      ),
    );
    return state;
  }

  if (Object.keys(tokensControllerState.allTokens).length) {
    Object.keys(tokensControllerState.allTokens).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        if (
          !Object.prototype.hasOwnProperty.call(
            newTokensControllerState.allTokens,
            hexChainId,
          )
        ) {
          newTokensControllerState.allTokens[hexChainId] =
            //@ts-expect-error Is verified on Line 613 that allTokens is a property
            tokensControllerState.allTokens[chainId];
        }
        if (isObject(tokensControllerState.allTokens)) {
          delete tokensControllerState.allTokens[chainId];
        }
      }
    });
  }

  if (
    !hasProperty(tokensControllerState, 'allIgnoredTokens') ||
    !isObject(tokensControllerState.allIgnoredTokens)
  ) {
    captureException(
      new Error(
        `Migration 31: Invalid TokensController allIgnoredTokens: '${JSON.stringify(
          tokensControllerState.allIgnoredTokens,
        )}'`,
      ),
    );
    return state;
  }

  if (Object.keys(tokensControllerState.allIgnoredTokens).length) {
    Object.keys(tokensControllerState.allIgnoredTokens).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        if (
          !Object.prototype.hasOwnProperty.call(
            newTokensControllerState.allIgnoredTokens,
            hexChainId,
          )
        ) {
          newTokensControllerState.allIgnoredTokens[hexChainId] =
            //@ts-expect-error Is verified on Line 643 that allIgnoredTokens is a property
            tokensControllerState.allIgnoredTokens[chainId];
        }
        if (isObject(tokensControllerState.allIgnoredTokens)) {
          delete tokensControllerState.allIgnoredTokens[chainId];
        }
      }
    });
  }

  if (
    !hasProperty(tokensControllerState, 'allDetectedTokens') ||
    !isObject(tokensControllerState.allDetectedTokens)
  ) {
    captureException(
      new Error(
        `Migration 31: Invalid TokensController allDetectedTokens: '${JSON.stringify(
          tokensControllerState.allDetectedTokens,
        )}'`,
      ),
    );
    return state;
  }

  if (Object.keys(tokensControllerState.allDetectedTokens).length) {
    Object.keys(tokensControllerState.allDetectedTokens).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        if (
          !Object.prototype.hasOwnProperty.call(
            newTokensControllerState.allDetectedTokens,
            hexChainId,
          )
        ) {
          newTokensControllerState.allDetectedTokens[hexChainId] =
            //@ts-expect-error Is verified on Line 671 that allIgnoredTokens is a property
            tokensControllerState.allDetectedTokens[chainId];
        }
        if (isObject(tokensControllerState.allDetectedTokens)) {
          delete tokensControllerState.allDetectedTokens[chainId];
        }
      }
    });
  }

  return state;
}
