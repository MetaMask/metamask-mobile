import { hasProperty, isObject } from '@metamask/utils';
import { captureException, captureMessage } from '@sentry/react-native';
import { ensureValidState } from './util';

const migrationVersion = 64;

/**
 * Migration to remove tokens with `decimals === null` from token-related properties
 * such as `allTokens`, `allDetectedTokens`, `tokens`, and `detectedTokens` in the
 * `TokensController` state.
 *
 * @param state - The current MetaMask extension state.
 * @returns The updated state with tokens having `decimals === null` removed.
 */
export default function migrate(state: unknown) {
  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const TokensController = state.engine.backgroundState.TokensController;

  if (!isObject(TokensController)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid TokensController state: '${migrationVersion}'`,
      ),
    );
    return state;
  }

  if (!isObject(TokensController.allTokens)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Missing allTokens property from TokensController: '${typeof state
          .engine.backgroundState.TokensController}'`,
      ),
    );
    return state;
  }

  TokensController.allTokens = transformTokenCollection(
    TokensController.allTokens,
    'allTokens',
  );

  if (!isObject(TokensController.allDetectedTokens)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Missing allDetectedTokens property from TokensController: '${typeof state
          .engine.backgroundState.TokensController}'`,
      ),
    );
    return state;
  }

  TokensController.allDetectedTokens = transformTokenCollection(
    TokensController.allDetectedTokens,
    'allDetectedTokens',
  );

  if (!Array.isArray(TokensController.tokens)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Missing tokens property from TokensController: '${typeof state
          .engine.backgroundState.TokensController}'`,
      ),
    );
    return state;
  }

  TokensController.tokens = TokensController.tokens.filter((token) =>
    validateAndLogToken(token, 'tokens'),
  );

  if (!Array.isArray(TokensController.detectedTokens)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Missing tokens property from TokensController: '${typeof state
          .engine.backgroundState.TokensController}'`,
      ),
    );
    return state;
  }

  TokensController.detectedTokens = TokensController.detectedTokens.filter(
    (token) => validateAndLogToken(token, 'detectedTokens'),
  );

  return state;
}

/**
 * Transforms a token collection to remove tokens with `decimals === null` and logs their removal.
 *
 * @param tokenCollection - The token collection to transform.
 * @param propertyName - The name of the property being transformed (for logging purposes).
 * @returns The updated token collection.
 */
function transformTokenCollection(
  tokenCollection: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> {
  const updatedCollection: Record<string, unknown> = {};

  for (const [chainId, accounts] of Object.entries(tokenCollection)) {
    if (isObject(accounts)) {
      const updatedAccounts: Record<string, unknown[]> = {};

      for (const [account, tokens] of Object.entries(accounts)) {
        if (Array.isArray(tokens)) {
          updatedAccounts[account] = tokens.filter((token) =>
            validateAndLogToken(token, `${propertyName} - chainId: ${chainId}`),
          );
        }
      }

      updatedCollection[chainId] = updatedAccounts;
    }
  }

  return updatedCollection;
}

/**
 * Validates a token object and logs its removal if `decimals === null`.
 *
 * @param token - The token object to validate.
 * @param propertyName - The property name or context for logging.
 * @returns `true` if the token is valid, `false` otherwise.
 */
function validateAndLogToken(token: unknown, propertyName: string): boolean {
  if (
    isObject(token) &&
    hasProperty(token, 'decimals') &&
    token.decimals === null &&
    hasProperty(token, 'address')
  ) {
    captureMessage(
      `Migration ${migrationVersion}: Removed token with decimals === null in ${propertyName}. Address: ${token.address}`,
    );
    return false;
  }
  return true;
}
