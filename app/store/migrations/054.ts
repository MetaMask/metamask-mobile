import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { Token, TokensControllerState } from '@metamask/assets-controllers';

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
  type TokenToMigrate = Token & { balanceError?: boolean };
  const tokens = tokensControllerState.tokens;

  const migratedTokens: Token[] = [];
  tokens.forEach((token: TokenToMigrate) => {
    if (token?.balanceError === null || token?.balanceError === undefined) {
      token.hasBalanceError = false;
    } else {
      token.hasBalanceError = true;
    }
    delete token?.balanceError;
    migratedTokens.push(token);
  });
  tokensControllerState.tokens = migratedTokens;

  // Return the modified state
  return state;
}
