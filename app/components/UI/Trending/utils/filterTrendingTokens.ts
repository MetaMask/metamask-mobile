import type { TrendingAsset } from '@metamask/assets-controllers';

const MANIPULATED_VOLUME_FEATURE_IDS = new Set(['WASH_TRADING', 'FAKE_VOLUME']);

/**
 * Returns true when a token lacks a meaningful ticker (symbol) or display name.
 * Tokens without these render blank placeholders in the UI.
 */
const lacksTickerOrName = (token: TrendingAsset): boolean =>
  !token.symbol?.trim() || !token.name?.trim();

/**
 * Returns true when security data flags wash trading or fake volume.
 */
const hasManipulatedVolume = (token: TrendingAsset): boolean =>
  token.securityData?.features?.some((feature) =>
    MANIPULATED_VOLUME_FEATURE_IDS.has(feature.featureId),
  ) ?? false;

/**
 * Filters out tokens that lack a meaningful symbol or name, and tokens whose
 * security data includes WASH_TRADING or FAKE_VOLUME.
 * Other risky tokens (Warning/Spam/Malicious) are intentionally kept in case
 * of false positives — they are surfaced with appropriate warnings via the security badge in the UI.
 */
export const filterLowQualityTokens = (
  tokens: TrendingAsset[],
): TrendingAsset[] =>
  tokens.filter(
    (token) => !lacksTickerOrName(token) && !hasManipulatedVolume(token),
  );
