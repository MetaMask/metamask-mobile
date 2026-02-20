import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export const migrationVersion = 121;

interface TokenWithDecimals {
  decimals?: number | string;
}

function normalizeTokenDecimals(token: TokenWithDecimals): void {
  if (!hasProperty(token, 'decimals')) {
    return;
  }
  const decimals = token.decimals;
  if (typeof decimals !== 'string') {
    return;
  }
  const parsed = parseInt(decimals, 10);
  token.decimals = Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeTokensDecimalsInMap(
  chainMap: Record<string, Record<string, TokenWithDecimals[]>>,
): void {
  for (const accountTokens of Object.values(chainMap)) {
    if (!isObject(accountTokens)) {
      continue;
    }
    for (const tokens of Object.values(accountTokens)) {
      if (!Array.isArray(tokens)) {
        continue;
      }
      for (const token of tokens) {
        if (isObject(token)) {
          normalizeTokenDecimals(token);
        }
      }
    }
  }
}

/**
 * Migration 121: Normalize TokensController allTokens and allDetectedTokens
 * so every token's decimals field is a number (not a string).
 *
 * @param state - The persisted Redux state (with engine.backgroundState inflated)
 * @returns The migrated Redux state
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const tokensControllerState =
    state?.engine?.backgroundState?.TokensController;
  if (!isObject(tokensControllerState)) {
    return state;
  }

  type TokensMap = Record<string, Record<string, TokenWithDecimals[]>>;

  // Normalize allTokens decimals
  if (
    hasProperty(tokensControllerState, 'allTokens') &&
    isObject(tokensControllerState.allTokens)
  ) {
    normalizeTokensDecimalsInMap(tokensControllerState.allTokens as TokensMap);
  }

  // Normalize allDetectedTokens decimals
  if (
    hasProperty(tokensControllerState, 'allDetectedTokens') &&
    isObject(tokensControllerState.allDetectedTokens)
  ) {
    normalizeTokensDecimalsInMap(
      tokensControllerState.allDetectedTokens as TokensMap,
    );
  }

  return state;
};

export default migration;
