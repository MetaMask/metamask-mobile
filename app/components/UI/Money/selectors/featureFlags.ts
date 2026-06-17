import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  parseBlockedCountriesEnv,
  VersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';
import { isMoneyAccountEnabled } from '../../../../lib/Money/feature-flags';
import {
  getWildcardTokenListFromConfig,
  WildcardTokenList,
} from '../../Earn/utils/wildcardTokenList';

/**
 * Selects whether the Money activity detail view is enabled.
 * When off, clicking on an activity list item does nothing instead of opening
 * the detail view.
 */
export const selectMoneyEnableActivityDetailsFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.moneyEnableActivityDetails as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * Selects whether the block explorer link is shown in Money activity detail
 * views. When off, the "View on block explorer" button is hidden.
 */
export const selectMoneyEnableActivityDetailsBlockexplorerLinkFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.moneyEnableActivityDetailsBlockexplorerLink as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  });

/** Temporary flag: remote value is a boolean only. */
export const selectMoneyActivityMockDataEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remote = remoteFeatureFlags?.moneyActivityMockDataEnabled;
    if (typeof remote === 'boolean') {
      return remote;
    }
    return process.env.MM_MONEY_ACTIVITY_MOCK_DATA_ENABLED === 'true';
  },
);

export const selectMoneyEnableMoneyAccountFlag = createSelector(
  selectRemoteFeatureFlags,
  isMoneyAccountEnabled,
);

export const selectMoneyHubEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MONEY_HUB_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMoneyHubEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Kill-switch for the first-time deposit Rive animation.
 * Defaults to ON (true).
 */
export const selectMoneyFirstTimeDepositAnimationEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.earnMoneyFirstTimeDepositAnimationEnabled as unknown as VersionGatedFeatureFlag;
    const local =
      process.env.MM_MONEY_FIRST_TIME_DEPOSIT_ANIMATION_ENABLED !== 'false';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? local;
  },
);

/**
 * Selects the blocked payment tokens for Money surfaces from remote config or local fallback.
 * Returns a wildcard blocklist mapping chain IDs (or "*") to token symbols (or ["*"]).
 *
 * Supports wildcards:
 * - "*" as chain key: applies to all chains
 * - "*" in symbol array: blocks all tokens on that chain
 *
 * Examples:
 * - { "*": ["SCAM"] }              - Block SCAM on ALL chains
 * - { "0x1": ["*"] }               - Block ALL tokens on Ethereum mainnet
 * - { "0xa4b1": ["USDT", "DAI"] }  - Block specific tokens on specific chain
 *
 * Remote flag takes precedence over local env var.
 * If both are unavailable, returns {} (no blocking).
 */
export const selectMoneyDepositTokensBlocklist = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList =>
    getWildcardTokenListFromConfig(
      remoteFeatureFlags?.earnMoneyPaymentTokensBlocklist,
      'earnMoneyPaymentTokensBlocklist',
      process.env.MM_MONEY_PAYMENT_TOKENS_BLOCKLIST,
      'MM_MONEY_PAYMENT_TOKENS_BLOCKLIST',
    ),
);

/**
 * Selects the no-fee tokens for Money surfaces from remote config or local fallback.
 * Returns a wildcard map of chain IDs (or "*") to token symbols (or ["*"]) that are
 * eligible for fee-free deposit into the Money account.
 *
 * Used by useMoneyDepositTokens to apply "no-fee priority" sorting when the remote
 * sort mode flag is set to `noFeePriority`.
 *
 * Remote flag takes precedence over local env var.
 * If both are unavailable, returns {} (no tokens have subsidised fees).
 */
export const selectMoneyNoFeeTokens = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList =>
    getWildcardTokenListFromConfig(
      remoteFeatureFlags?.earnMoneyDepositNoFeeTokens,
      'earnMoneyDepositNoFeeTokens',
      process.env.MM_MONEY_DEPOSIT_NO_FEE_TOKENS,
      'MM_MONEY_DEPOSIT_NO_FEE_TOKENS',
    ),
);

const FALLBACK_MONEY_DEPOSIT_MIN_BALANCE = 0.01; // 1 cent

/**
 * Selects the minimum fiat balance (in the user's selected currency) a token
 * must have to appear in Money deposit surfaces.
 *
 * Prevents dust tokens from cluttering the deposit token list.
 *
 * Accepts a number or numeric string from the remote flag.
 * Remote flag takes precedence over local env var.
 * Fallback: $0.01 (1 cent).
 */
export const selectMoneyDepositMinBalance = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): number => {
    const localRaw = process.env.MM_MONEY_DEPOSIT_MIN_ASSET_BALANCE;
    const local =
      localRaw === undefined ? undefined : Number.parseFloat(localRaw);

    const remoteRaw = remoteFeatureFlags?.earnMoneyDepositMinAssetBalance;
    const remote =
      typeof remoteRaw === 'number'
        ? remoteRaw
        : typeof remoteRaw === 'string'
          ? Number.parseFloat(remoteRaw)
          : undefined;

    const remoteValue = Number.isFinite(remote) ? remote : undefined;
    const localValue = Number.isFinite(local) ? local : undefined;

    return remoteValue ?? localValue ?? FALLBACK_MONEY_DEPOSIT_MIN_BALANCE;
  },
);

/**
 * Valid sort modes for useMoneyDepositTokens.
 * - fiatBalanceDesc: all eligible tokens sorted by fiat balance descending (default)
 * - noFeePriority: no-fee tokens bucket first (fiat-desc), then fee tokens bucket (fiat-desc)
 */
export type MoneyTokensSortMode = 'fiatBalanceDesc' | 'noFeePriority';

const VALID_SORT_MODES: MoneyTokensSortMode[] = [
  'fiatBalanceDesc',
  'noFeePriority',
];

/**
 * Selects the remote sort mode for Money token lists.
 * Remote flag `moneyTokensSortMode` accepts the string values
 * `fiatBalanceDesc` or `noFeePriority`.
 *
 * Fallback: `fiatBalanceDesc` when the remote value is absent or invalid.
 */
export const selectMoneyTokensSortMode = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): MoneyTokensSortMode => {
    const remote = remoteFeatureFlags?.earnMoneyTokensSortMode;
    if (
      typeof remote === 'string' &&
      VALID_SORT_MODES.includes(remote as MoneyTokensSortMode)
    ) {
      return remote as MoneyTokensSortMode;
    }
    return 'fiatBalanceDesc';
  },
);

/** Default blocked countries for Money account when no remote flag is configured. */
export const DEFAULT_MONEY_ACCOUNT_BLOCKED_COUNTRIES = ['GB'];

/**
 * Selects the geo-blocked countries for the Money account from remote config or local fallback.
 * Returns an array of ISO 3166-1 alpha-2 country codes (e.g., ['GB', 'US']).
 *
 * The Ramps geolocation API returns country codes like "GB" or "US-CA" (country-region).
 * Matching uses startsWith to handle both country-only and country-region formats.
 *
 * Remote flag takes precedence over local env var.
 *
 * Examples:
 * - Remote: { "blockedRegions": ["GB"] }      - Block users in Great Britain
 * - Remote: { "blockedRegions": ["GB", "US"] } - Block users in GB and US
 * - Local env: "GB,US,FR"                        - Block users in GB, US, and FR
 *
 * If both remote and local are unavailable or invalid, defaults to blocking Great Britain.
 */
export const selectMoneyAccountGeoBlockedCountries = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] => {
    // Try remote flag first (takes precedence)
    const remoteFlag = remoteFeatureFlags?.moneyAccountGeoBlockedCountries as
      | { blockedRegions?: string[] }
      | undefined;

    if (Array.isArray(remoteFlag?.blockedRegions)) {
      return remoteFlag.blockedRegions;
    }

    // Fallback to local env var
    const envBlockedCountries = parseBlockedCountriesEnv(
      process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES,
    );

    // If env var is also empty, use default blocked countries
    return envBlockedCountries.length > 0
      ? envBlockedCountries
      : DEFAULT_MONEY_ACCOUNT_BLOCKED_COUNTRIES;
  },
);
