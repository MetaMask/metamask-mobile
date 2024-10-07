import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { TokensControllerState } from '@metamask/assets-controllers';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 54)) {
    // Increment the migration number as appropriate
    return state;
  }

  const tokensControllerState = state.engine.backgroundState
    .TokensController as TokensControllerState;
  if (!isObject(tokensControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 54: Invalid TokensController state error: '${typeof tokensControllerState}'`,
      ),
    );
    return state;
  }

  if ('tokens' in tokensControllerState) {
    const migratedTokens = tokensControllerState.tokens.map((token) => {
      if (!hasProperty(token, 'balanceError')) {
        return token;
      }
      if (token?.balanceError === null || token?.balanceError === undefined) {
        token.hasBalanceError = false;
      } else {
        token.hasBalanceError = true;
      }
      delete token?.balanceError;
      return token;
    });
    tokensControllerState.tokens = migratedTokens;
  }

  // Return the modified state
  return state;
}
