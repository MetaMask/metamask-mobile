import type { TrendingAsset } from '@metamask/assets-controllers';

/**
 * Returns true when a token lacks a meaningful ticker (symbol) or display name.
 * Tokens without these render blank placeholders in the UI.
 */
const lacksTickerOrName = (token: TrendingAsset): boolean =>
  !token.symbol?.trim() || !token.name?.trim();

/**
 * Filters out tokens that lack a meaningful symbol or name.
 * Risky tokens (Warning/Spam/Malicious) are intentionally kept — they are
 * surfaced with appropriate warnings via the security badge in the UI.
 */
export const filterLowQualityTokens = (
  tokens: TrendingAsset[],
): TrendingAsset[] => tokens.filter((token) => !lacksTickerOrName(token));
