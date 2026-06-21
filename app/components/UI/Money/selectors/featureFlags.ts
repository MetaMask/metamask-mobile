import { createSelector } from 'reselect';
import { CHAIN_IDS } from '@metamask/transaction-controller';
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
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import { MONEY_NO_FEE_TOKENS_FALLBACK } from '../utils/depositFaqTokens';
import { getRelayFixedSpreadRoutesWithSymbols } from '../../../Views/confirmations/utils/relayFixedSpread';
import { parseNonNegativeFinite } from '../utils/number';
import { MoneyVaultApyRemoteConfig } from './featureFlags.types';

/**
 * Selects whether the Money activity detail view is enabled.
 * When off, clicking on an activity list item does nothing instead of opening
 * the detail view.
 */
export const selectMoneyEnableActivityDetailsFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MONEY_ENABLE_ACTIVITY_DETAILS === 'true';
    const remoteFlag =
      remoteFeatureFlags?.moneyEnableActivityDetails as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selects whether the block explorer link is shown in Money activity detail
 * views. When off, the "View on block explorer" button is hidden.
 */
export const selectMoneyEnableActivityDetailsBlockexplorerLinkFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_MONEY_ENABLE_ACTIVITY_DETAILS_BLOCKEXPLORER_LINK ===
      'true';
    const remoteFlag =
      remoteFeatureFlags?.moneyEnableActivityDetailsBlockexplorerLink as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
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
 * Selects the no-fee tokens for Money surfaces from remote config or local fallback.
 * Returns a wildcard map of chain IDs (or "*") to token symbols (or ["*"]) that are
 * eligible for fee-free deposit into the Money account.
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
    const localValue = parseNonNegativeFinite(
      process.env.MM_MONEY_DEPOSIT_MIN_ASSET_BALANCE,
    );
    const remoteValue = parseNonNegativeFinite(
      remoteFeatureFlags?.earnMoneyDepositMinAssetBalance,
    );

    return remoteValue ?? localValue ?? FALLBACK_MONEY_DEPOSIT_MIN_BALANCE;
  },
);

export const selectMoneyVaultApyRemoteConfig = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): MoneyVaultApyRemoteConfig => {
    const raw = remoteFeatureFlags?.earnMoneyVaultApyControl as
      | Record<string, unknown>
      | undefined;

    const vaultApyFallback = parseNonNegativeFinite(raw?.vaultApyFallback);
    const vaultApyOverride = parseNonNegativeFinite(raw?.vaultApyOverride);

    return { vaultApyFallback, vaultApyOverride };
  },
);

/**
 * Converts a raw token alias (e.g. "eth_usdc", "eth_ausdc", "musd") to its
 * display symbol:
 * - Strip the chain prefix ("eth_usdc" → "usdc")
 * - aave-style tokens (leading 'a' followed by a letter): "ausdc" → "aUSDC"
 * - all others: full uppercase ("usdc" → "USDC")
 */
const normalizeTokenSymbol = (tokenAlias: string): string => {
  const underscoreIdx = tokenAlias.indexOf('_');
  const raw =
    underscoreIdx >= 0 ? tokenAlias.slice(underscoreIdx + 1) : tokenAlias;
  if (/^a[a-z]/i.test(raw)) {
    return 'a' + raw.slice(1).toUpperCase();
  }
  return raw.toUpperCase();
};

/**
 * Derives the no-fee deposit token catalog from the `confirmations_relay_fixed_spread`
 * remote feature flag, scoped to Money account deposits (output = Monad mUSD).
 *
 * Filters routes where the destination is Monad mUSD, then maps each input
 * (chainId, tokenAlias) to a display symbol, emitting a WildcardTokenList
 * (hex chainId → [SYMBOL, ...]) compatible with formatNoFeeTokenBullets and
 * formatBaseStablecoins in depositFaqTokens.ts.
 *
 * Falls back to MONEY_NO_FEE_TOKENS_FALLBACK when the flag is absent or
 * structurally invalid, preserving current FAQ behaviour.
 *
 * Uses getRelayFixedSpreadRoutesWithSymbols (the alias-preserving parser) rather
 * than selectRelayFixedSpread, because the parsed RelayFixedSpreadConfig drops
 * the token alias keys that carry the symbols the FAQ renders.
 */
export const selectMoneyNoFeeDepositTokens = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList => {
    const routes = getRelayFixedSpreadRoutesWithSymbols(
      remoteFeatureFlags?.confirmations_relay_fixed_spread,
      'confirmations_relay_fixed_spread',
    );

    const monadHex = CHAIN_IDS.MONAD.toLowerCase();
    const musdAddress = MUSD_TOKEN_ADDRESS.toLowerCase();

    const catalog: Record<string, string[]> = {};

    for (const route of routes) {
      // Only deposit routes: output must resolve to Monad mUSD
      if (
        route.targetChain.toLowerCase() !== monadHex ||
        route.targetToken.toLowerCase() !== musdAddress
      ) {
        continue;
      }

      const srcChainHex = route.sourceChain.toLowerCase();
      const symbol = normalizeTokenSymbol(route.sourceTokenAlias);

      if (!catalog[srcChainHex]) catalog[srcChainHex] = [];
      if (!catalog[srcChainHex].includes(symbol)) {
        catalog[srcChainHex].push(symbol);
      }
    }

    return Object.keys(catalog).length > 0
      ? catalog
      : MONEY_NO_FEE_TOKENS_FALLBACK;
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
