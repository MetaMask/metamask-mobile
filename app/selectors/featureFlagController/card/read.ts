import {
  CardProviderIds,
  type CardProviderId,
} from '../../../core/Engine/controllers/card-controller/provider-types';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';
import {
  DEFAULT_IMMERSVE_CHAINS,
  DEFAULT_IMMERSVE_CONFIG,
  DEFAULT_IMMERSVE_COUNTRIES,
  defaultCardFeatureFlag,
  defaultCardUkMigrationFlag,
} from './defaults';
import type {
  CardFeatureFlag,
  CardProvisioningFacts,
  CardProviderChain,
  CardProviderChains,
  CardProviderFlagKeys,
  CardProviderTokenConfig,
  CardUkMigrationFlag,
  CardUkMigrationState,
  ImmersveProgramConfig,
  ProvisioningDevice,
  ProvisioningPlatform,
  ProvisioningWallet,
  ResolvedProvisioningWallet,
} from './types';

/**
 * `RemoteFeatureFlagController.remoteFeatureFlags` — the **resolved** flag bag.
 * Readers take this rather than `RootState` so `CardController` — which reaches
 * flags through `messenger.call('RemoteFeatureFlagController:getState')` and
 * cannot use reselect — runs the exact same resolution as the UI selectors.
 *
 * It must be the resolved bag, never `rawRemoteFeatureFlags`. A gradual-rollout
 * flag is authored as an array of threshold cohorts and the controller collapses
 * it to the selected cohort's `value` (`{ enabled, minimumVersion }`) before it
 * lands here. Passing the raw bag would hand `validatedVersionGatedFeatureFlag`
 * an array it cannot read, silently switching the provider off for everyone.
 * See `handleMoney.ts` for the same distinction drawn at a deeplink handler.
 */
export type CardRemoteFeatureFlags = Record<string, unknown> | null | undefined;

/**
 * The per-provider flag contract. Adding a provider is an entry here; the
 * readers below need no changes.
 */
export const CARD_PROVIDER_FLAGS: Record<string, CardProviderFlagKeys> = {
  [CardProviderIds.Immersve]: {
    gate: 'cardImmersve',
    config: 'cardImmersveConfig',
    chains: 'cardImmersveChains',
    countries: 'cardImmersveCountries',
  },
  // baanx: added when Baanx migrates off cardFeature — table entry, no new code.
};

/** Provider used when no provider claims the country. */
export const FALLBACK_CARD_PROVIDER_ID: CardProviderId = CardProviderIds.Baanx;

const isNonEmptyObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).length > 0;

/**
 * `process.env` member expressions must be written out literally — the React
 * Native env transform does not inline dynamic `process.env[key]` lookups.
 */
const readProviderEnvOverride = (providerId: string): boolean => {
  if (providerId === CardProviderIds.Immersve) {
    return process.env.MM_CARD_IMMERSVE_ENABLED === 'true';
  }
  return false;
};

/**
 * The `cardFeature` flag (Baanx chains + shared constants), falling back to the
 * built-in default when absent or empty.
 */
export function readCardFeatureFlag(
  flags: CardRemoteFeatureFlags,
): CardFeatureFlag {
  const raw = flags?.cardFeature;
  return isNonEmptyObject(raw)
    ? (raw as CardFeatureFlag)
    : defaultCardFeatureFlag;
}

export function readCardLinkApiEnabled(flags: CardRemoteFeatureFlags): boolean {
  const gated = validatedVersionGatedFeatureFlag(flags?.cardLinkApi);
  if (gated !== undefined) {
    return gated;
  }
  return process.env.MM_CARD_LINK_API_ENABLED === 'true';
}

/**
 * Whether a provider is available.
 *
 * Resolution order: the `card<Provider>` switch -> the local env override ->
 * false.
 *
 * The switch is expected to be a gradual-rollout flag. The controller has
 * already picked the cohort by the time we see it, so the value here is a plain
 * `{ enabled, minimumVersion }` and needs no rollout-specific handling: a user
 * outside the rollout gets the disabled cohort and resolves to `false`, which
 * for a provider switch means the same thing as off — routing falls through to
 * {@link FALLBACK_CARD_PROVIDER_ID}. Distinguishing "not in rollout" from
 * "disabled" (as `handleMoney.ts` does, via `rawRemoteFeatureFlags`) would only
 * be needed to show a rollout-specific message.
 *
 * `CardController` and the onboarding UI must both route through this, or they
 * can disagree about whether a provider is on.
 */
export function readCardProviderEnabled(
  flags: CardRemoteFeatureFlags,
  providerId: string,
): boolean {
  const keys = CARD_PROVIDER_FLAGS[providerId];
  if (!keys) {
    return false;
  }

  const gated = validatedVersionGatedFeatureFlag(flags?.[keys.gate]);
  if (gated !== undefined) {
    return gated;
  }

  return readProviderEnvOverride(providerId);
}

/** A provider's `card<Provider>Config` flag. */
export function readCardProviderConfig<T = ImmersveProgramConfig>(
  flags: CardRemoteFeatureFlags,
  providerId: string,
): T {
  const keys = CARD_PROVIDER_FLAGS[providerId];
  const raw = keys ? flags?.[keys.config] : undefined;
  if (isNonEmptyObject(raw)) {
    return raw as T;
  }

  if (providerId === CardProviderIds.Immersve) {
    return DEFAULT_IMMERSVE_CONFIG as T;
  }

  return {} as T;
}

/** A provider's `card<Provider>Countries` allowlist. */
export function readCardProviderCountries(
  flags: CardRemoteFeatureFlags,
  providerId: string,
): string[] {
  const keys = CARD_PROVIDER_FLAGS[providerId];
  const raw = keys ? flags?.[keys.countries] : undefined;
  if (
    Array.isArray(raw) &&
    raw.every((entry): entry is string => typeof entry === 'string')
  ) {
    return raw;
  }

  if (providerId === CardProviderIds.Immersve) {
    return DEFAULT_IMMERSVE_COUNTRIES;
  }

  return [];
}

const toTokenConfig = (value: unknown): CardProviderTokenConfig | null => {
  if (!isNonEmptyObject(value)) {
    return null;
  }
  const { decimals, symbol } = value as {
    decimals?: unknown;
    symbol?: unknown;
  };
  if (typeof decimals !== 'number' || !Number.isFinite(decimals)) {
    return null;
  }
  return {
    decimals,
    ...(typeof symbol === 'string' ? { symbol } : {}),
  };
};

/**
 * Keeps only token entries whose CAIP-19 key sits on the chain it is nested
 * under, so a mis-keyed flag entry cannot scale amounts on the wrong chain.
 */
const sanitizeChain = (
  caipChainId: string,
  value: unknown,
): CardProviderChain | null => {
  if (!isNonEmptyObject(value)) {
    return null;
  }
  const { network, rpcUrl, fallbackRpcUrl, tokens } = value as {
    network?: unknown;
    rpcUrl?: unknown;
    fallbackRpcUrl?: unknown;
    tokens?: unknown;
  };

  const sanitizedTokens: Record<string, CardProviderTokenConfig> = {};
  if (isNonEmptyObject(tokens)) {
    for (const [assetId, tokenValue] of Object.entries(tokens)) {
      if (!assetId.toLowerCase().startsWith(`${caipChainId.toLowerCase()}/`)) {
        continue;
      }
      const tokenConfig = toTokenConfig(tokenValue);
      if (tokenConfig) {
        sanitizedTokens[assetId] = tokenConfig;
      }
    }
  }

  return {
    ...(typeof network === 'string' ? { network } : {}),
    ...(typeof rpcUrl === 'string' ? { rpcUrl } : {}),
    ...(typeof fallbackRpcUrl === 'string' ? { fallbackRpcUrl } : {}),
    tokens: sanitizedTokens,
  };
};

/** A provider's `card<Provider>Chains` networks and funding-token allowlist. */
export function readCardProviderChains(
  flags: CardRemoteFeatureFlags,
  providerId: string,
): CardProviderChains {
  const keys = CARD_PROVIDER_FLAGS[providerId];
  const raw = keys ? flags?.[keys.chains] : undefined;

  let source: Record<string, unknown>;
  if (isNonEmptyObject(raw)) {
    source = raw;
  } else if (providerId === CardProviderIds.Immersve) {
    source = DEFAULT_IMMERSVE_CHAINS as unknown as Record<string, unknown>;
  } else {
    return {};
  }

  const chains: CardProviderChains = {};
  for (const [caipChainId, chainValue] of Object.entries(source)) {
    const chain = sanitizeChain(caipChainId, chainValue);
    if (chain) {
      chains[caipChainId] = chain;
    }
  }
  return chains;
}

/**
 * Routes a country to a provider. Providers that are switched off are skipped,
 * and anything unclaimed falls through to {@link FALLBACK_CARD_PROVIDER_ID}.
 */
export function resolveCardProviderForCountry(
  flags: CardRemoteFeatureFlags,
  country: string,
): CardProviderId {
  for (const providerId of Object.keys(CARD_PROVIDER_FLAGS)) {
    if (!readCardProviderEnabled(flags, providerId)) {
      continue;
    }
    if (readCardProviderCountries(flags, providerId).includes(country)) {
      return providerId as CardProviderId;
    }
  }
  return FALLBACK_CARD_PROVIDER_ID;
}

const normalizeCardUkMigrationFlag = (
  raw: unknown,
): CardUkMigrationFlag | null => {
  let source: unknown = raw;
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'value' in raw &&
    isNonEmptyObject((raw as { value?: unknown }).value)
  ) {
    source = (raw as { value: unknown }).value;
  }

  if (!isNonEmptyObject(source)) {
    return null;
  }

  const { enabled, minimumVersion, startDate, endDate } = source;

  if (typeof enabled !== 'boolean' || typeof minimumVersion !== 'string') {
    return null;
  }

  return {
    enabled,
    minimumVersion,
    ...(typeof startDate === 'string' ? { startDate } : {}),
    ...(typeof endDate === 'string' ? { endDate } : {}),
  };
};

/** The `cardUkMigration` flag, or null when absent / invalid. */
export function readCardUkMigrationFlag(
  flags: CardRemoteFeatureFlags,
): CardUkMigrationFlag | null {
  return normalizeCardUkMigrationFlag(flags?.cardUkMigration);
}

const parseIsoDate = (value: string | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** ISO country code for UK Card migration eligibility (Baanx GB only). */
export const CARD_UK_MIGRATION_COUNTRY_CODE = 'GB';

/**
 * Resolves migration phase from the remote flag bag.
 * `endDate` is the deadline (soft → forced), not a feature-off time.
 * Missing or invalid `startDate` / `endDate`, or `startDate >= endDate`,
 * is treated like `enabled: false`.
 */
export function resolveCardUkMigrationState(
  flags: CardRemoteFeatureFlags,
  now: Date = new Date(),
): CardUkMigrationState {
  const remoteFlag = readCardUkMigrationFlag(flags);
  const flag = remoteFlag ?? defaultCardUkMigrationFlag;
  const start = parseIsoDate(flag.startDate);
  const end = parseIsoDate(flag.endDate);
  const inactiveState: CardUkMigrationState = {
    phase: 'off',
    isActive: false,
    deadline: end,
  };

  const localEnabled = process.env.MM_CARD_UK_MIGRATION_ENABLED === 'true';
  const gateOpen =
    (remoteFlag ? validatedVersionGatedFeatureFlag(flag) : undefined) ??
    localEnabled;

  if (!gateOpen || !start || !end || start >= end) {
    return inactiveState;
  }

  if (now < start) {
    return inactiveState;
  }

  if (now >= end) {
    return {
      phase: 'forced',
      isActive: true,
      deadline: end,
    };
  }

  return {
    phase: 'soft',
    isActive: true,
    deadline: end,
  };
}

/** Whether a Baanx UK card user should see migration prompts. */
export function isCardUkMigrationEligible(
  state: CardUkMigrationState,
  params: {
    providerId: CardProviderId | null | undefined;
    /** ISO country/region (Baanx `countryOfResidence` or Immersve `regionCode`). */
    regionCode: string | null | undefined;
    hasCompletedMigration?: boolean;
  },
): boolean {
  if (params.hasCompletedMigration) {
    return false;
  }
  if (!state.isActive) {
    return false;
  }
  if (params.providerId !== CardProviderIds.Baanx) {
    return false;
  }
  return params.regionCode?.toUpperCase() === CARD_UK_MIGRATION_COUNTRY_CODE;
}

export function readCardUkMigrationSignInRoutingEnabled(
  flags: CardRemoteFeatureFlags,
): boolean {
  const gated = validatedVersionGatedFeatureFlag(
    flags?.cardUkMigrationSignInRouting,
  );
  if (gated !== undefined) {
    return gated;
  }
  return process.env.MM_CARD_UK_MIGRATION_SIGN_IN_ROUTING_ENABLED === 'true';
}

/**
 * Immersve SIWE MFA. Off unless `cardImmersveMfa` explicitly enables it, or
 * `MM_CARD_IMMERSVE_MFA_ENABLED=true` when the remote flag is missing.
 */
export function readCardImmersveMfaEnabled(
  flags: CardRemoteFeatureFlags,
): boolean {
  const gated = validatedVersionGatedFeatureFlag(flags?.cardImmersveMfa);
  if (gated !== undefined) {
    return gated;
  }
  return process.env.MM_CARD_IMMERSVE_MFA_ENABLED === 'true';
}

/** Soft-period window that elevates the Accounts menu badge to warning. */
export const CARD_UK_MIGRATION_UPDATE_BADGE_WARNING_DAYS = 7;

export type CardUkMigrationUpdateBadgeSeverity = 'info' | 'warning' | 'danger';

/**
 * Accounts menu "Update" badge severity for eligible Baanx UK users:
 * - `info` while soft migration has started (more than 7 days before end)
 * - `warning` within 7 days of `endDate`
 * - `danger` once the soft period has ended (`forced`)
 */
export function getCardUkMigrationUpdateBadgeSeverity(
  state: CardUkMigrationState,
  now: Date = new Date(),
): CardUkMigrationUpdateBadgeSeverity | null {
  if (!state.isActive) {
    return null;
  }

  // The phase can remain `soft` while a focused screen is mounted across the
  // deadline. Let the current clock take precedence over that cached phase.
  if (state.deadline && now >= state.deadline) {
    return 'danger';
  }

  if (state.phase === 'forced') {
    return 'danger';
  }

  if (state.phase !== 'soft' || !state.deadline) {
    return null;
  }

  const msUntilDeadline = state.deadline.getTime() - now.getTime();
  const warningWindowMs =
    CARD_UK_MIGRATION_UPDATE_BADGE_WARNING_DAYS * 24 * 60 * 60 * 1000;

  if (msUntilDeadline <= warningWindowMs) {
    return 'warning';
  }

  return 'info';
}

/**
 * Remote keys for the nested provisioning flags. Sibling of
 * {@link CARD_PROVIDER_FLAGS}: Baanx is not a `card<Provider>` switch.
 */
export const CARD_PROVISIONING_FLAG_KEYS: Record<string, string> = {
  [CardProviderIds.Baanx]: 'cardBaanxProvisioning',
  [CardProviderIds.Immersve]: 'cardImmersveProvisioning',
};

/**
 * Wallets this build can offer. A `samsung_pay` leaf is parsed, then dropped,
 * until the Samsung Pay work adds it here.
 */
export const IMPLEMENTED_PROVISIONING_WALLETS: readonly ProvisioningWallet[] = [
  'apple_wallet',
  'google_wallet',
];

/** Shared empty result so a miss does not allocate. */
export const NO_PROVISIONING_WALLETS: readonly ResolvedProvisioningWallet[] =
  Object.freeze([]);

const PROVISIONING_WALLET_ORDER: readonly ProvisioningWallet[] = [
  'apple_wallet',
  'google_wallet',
  'samsung_pay',
];

const PROVISIONING_WALLETS_BY_PLATFORM: Record<
  ProvisioningPlatform,
  readonly ProvisioningWallet[]
> = {
  ios: ['apple_wallet'],
  android: ['google_wallet', 'samsung_pay'],
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A rollout envelope is `{ value: object }` without its own `enabled` boolean.
 * A flag object that already has `enabled` is left alone, same as
 * `normalizeCardUkMigrationFlag` detecting a nested `value`.
 */
const unwrapProvisioningFlag = (raw: unknown): unknown => {
  if (!isPlainObject(raw) || typeof raw.enabled === 'boolean') {
    return raw;
  }
  if ('value' in raw && isNonEmptyObject(raw.value)) {
    return raw.value;
  }
  return raw;
};

const isProvisioningFlagShape = (value: unknown): boolean =>
  isPlainObject(value) &&
  typeof value.enabled === 'boolean' &&
  typeof value.minimumVersion === 'string' &&
  isPlainObject(value.countries);

const findCountryRule = (
  countries: Record<string, unknown>,
  countryCode: string | undefined,
): unknown => {
  if (!countryCode) {
    return undefined;
  }
  const wanted = countryCode.toUpperCase();
  for (const [key, rule] of Object.entries(countries)) {
    if (key.toUpperCase() === wanted) {
      return rule;
    }
  }
  return undefined;
};

const readEligibility = (value: unknown): Record<string, unknown> | 'fail' => {
  if (value === undefined) {
    return {};
  }
  return isPlainObject(value) ? value : 'fail';
};

const isNonEmptyStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((entry) => typeof entry === 'string');

/**
 * Country rules first, then each key present on the wallet leaf. An unknown
 * key, or a `cardProcessors` list that misses the fact, fails closed.
 */
const eligibilityPasses = (
  countryEligibility: unknown,
  leafEligibility: unknown,
  cardProcessor: string | undefined,
): boolean => {
  const countryRules = readEligibility(countryEligibility);
  const leafRules = readEligibility(leafEligibility);
  if (countryRules === 'fail' || leafRules === 'fail') {
    return false;
  }

  const merged = { ...countryRules, ...leafRules };
  for (const [key, rule] of Object.entries(merged)) {
    if (key !== 'cardProcessors') {
      return false;
    }
    if (
      !isNonEmptyStringArray(rule) ||
      cardProcessor === undefined ||
      !rule.includes(cardProcessor)
    ) {
      return false;
    }
  }
  return true;
};

const readSamsungDevices = (
  leaf: Record<string, unknown>,
): ProvisioningDevice[] | null => {
  const { devices } = leaf;
  if (!Array.isArray(devices)) {
    return ['phone', 'watch'];
  }
  const kept = devices.filter(
    (entry): entry is ProvisioningDevice =>
      entry === 'phone' || entry === 'watch',
  );
  return kept.length > 0 ? kept : null;
};

const isWalletLeaf = (
  value: unknown,
): value is { enabled: boolean; minimumVersion: string } & Record<
  string,
  unknown
> =>
  isPlainObject(value) &&
  typeof value.enabled === 'boolean' &&
  typeof value.minimumVersion === 'string';

/**
 * Wallets a provider may offer for these facts.
 *
 * A valid flag wins, including when it resolves to no wallets. Absence or an
 * unparseable top-level value offers nothing. `implementedWallets` defaults to
 * {@link IMPLEMENTED_PROVISIONING_WALLETS}; tests and the Samsung Pay work pass
 * a wider set to exercise `devices`.
 */
export function resolveCardProvisioningWallets(
  flags: CardRemoteFeatureFlags,
  providerId: string,
  facts: CardProvisioningFacts,
  implementedWallets: readonly ProvisioningWallet[] = IMPLEMENTED_PROVISIONING_WALLETS,
): readonly ResolvedProvisioningWallet[] {
  const flagKey = CARD_PROVISIONING_FLAG_KEYS[providerId];
  if (!flagKey) {
    return NO_PROVISIONING_WALLETS;
  }

  const unwrapped = unwrapProvisioningFlag(flags?.[flagKey]);
  if (!isProvisioningFlagShape(unwrapped)) {
    return NO_PROVISIONING_WALLETS;
  }

  if (validatedVersionGatedFeatureFlag(unwrapped) !== true) {
    return NO_PROVISIONING_WALLETS;
  }

  const countries = (unwrapped as { countries: Record<string, unknown> })
    .countries;
  const countryRule = findCountryRule(countries, facts.countryCode);
  if (!isPlainObject(countryRule) || countryRule.enabled !== true) {
    return NO_PROVISIONING_WALLETS;
  }

  const platformRule = countryRule[facts.platform];
  if (!isPlainObject(platformRule)) {
    return NO_PROVISIONING_WALLETS;
  }

  const allowed = PROVISIONING_WALLETS_BY_PLATFORM[facts.platform];
  const kept: ResolvedProvisioningWallet[] = [];
  for (const wallet of PROVISIONING_WALLET_ORDER) {
    if (!allowed.includes(wallet) || !implementedWallets.includes(wallet)) {
      continue;
    }
    const leaf = platformRule[wallet];
    if (!isWalletLeaf(leaf)) {
      continue;
    }
    if (
      validatedVersionGatedFeatureFlag({
        enabled: leaf.enabled,
        minimumVersion: leaf.minimumVersion,
      }) !== true
    ) {
      continue;
    }
    if (
      !eligibilityPasses(
        countryRule.eligibility,
        leaf.eligibility,
        facts.cardProcessor,
      )
    ) {
      continue;
    }
    if (wallet === 'samsung_pay') {
      const devices = readSamsungDevices(leaf);
      if (!devices) {
        continue;
      }
      kept.push({ wallet, devices });
      continue;
    }
    kept.push({ wallet });
  }

  return kept.length > 0 ? kept : NO_PROVISIONING_WALLETS;
}
