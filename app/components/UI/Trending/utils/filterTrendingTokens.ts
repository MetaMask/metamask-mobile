import type { TrendingAsset } from '@metamask/assets-controllers';

/**
 * Result types considered risky by the Token API security scan.
 * Tokens with these types are hidden from surfaces that opt into quality filtering.
 */
const RISKY_RESULT_TYPES = new Set(['Warning', 'Spam', 'Malicious']);

/**
 * Returns true when a token's security data indicates risk.
 */
const isRiskyToken = (token: TrendingAsset): boolean => {
  const resultType = token.securityData?.resultType;
  return !!resultType && RISKY_RESULT_TYPES.has(resultType);
};

/**
 * Returns true when a token lacks a meaningful ticker (symbol).
 * Tokens without a symbol render blank placeholders in the UI.
 */
const lacksTickerOrName = (token: TrendingAsset): boolean =>
  !token.symbol?.trim() || !token.name?.trim();

/**
 * Filters out low-quality and risky tokens from a trending list.
 *
 * Removed tokens:
 * - Missing or empty `symbol` / `name` (no useful ticker or display name)
 * - Security `resultType` of Warning, Spam, or Malicious
 *
 * The filter is designed to be configurable: callers that don't want it
 * (e.g. a future "meme" section) simply skip calling this function.
 */
export const filterLowQualityTokens = (
  tokens: TrendingAsset[],
): TrendingAsset[] =>
  tokens.filter((token) => !lacksTickerOrName(token) && !isRiskyToken(token));
