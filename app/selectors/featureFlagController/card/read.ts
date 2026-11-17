import { parseCaipAssetType, type CaipAssetType } from '@metamask/utils';
import {
  CardProviderIds,
  type CardProviderId,
} from '../../../core/Engine/controllers/card-controller/provider-types';
import { immersveNetworkToFundingToken } from '../../../components/UI/Card/util/immersveFunding';
import Logger from '../../../util/Logger';
import {
  hasMinimumRequiredVersion,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
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
  ImmersveFundingChannel,
  ImmersveFundingSourceType,
  ImmersveProgramConfig,
  ProvisioningDevice,
  ProvisioningPlatform,
  ProvisioningWallet,
  ResolvedProvisioningWallet,
} from './types';

const IMMERSVE_FUNDING_SOURCE_TYPES: readonly ImmersveFundingSourceType[] = [
  'wallet',
  'moneyAccount',
];

const isImmersveFundingSourceType = (
  value: unknown,
): value is ImmersveFundingSourceType =>
  IMMERSVE_FUNDING_SOURCE_TYPES.includes(value as ImmersveFundingSourceType);

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyObject = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length > 0;

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
  if (providerId === CardProviderIds.Immersve) {
    return Object.keys(readImmersveCountryFunding(flags));
  }

  const keys = CARD_PROVIDER_FLAGS[providerId];
  const raw = keys ? flags?.[keys.countries] : undefined;
  if (
    Array.isArray(raw) &&
    raw.every((entry): entry is string => typeof entry === 'string')
  ) {
    return raw;
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

const logImmersveFundingFlag = (message: string): void => {
  Logger.error(new Error(message), {
    tags: { feature: 'card', provider: 'immersve' },
    context: {
      name: 'ImmersveFundingChannels',
      data: { message },
    },
  });
};

const findChainToken = (
  tokens: Record<string, CardProviderTokenConfig> | undefined,
  assetId: string,
): CardProviderTokenConfig | null => {
  if (!tokens) {
    return null;
  }
  const exact = tokens[assetId];
  if (exact) {
    return exact;
  }
  const target = assetId.toLowerCase();
  for (const [key, value] of Object.entries(tokens)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return null;
};

const sanitizeFundingChannel = (
  name: string,
  value: unknown,
  chains: CardProviderChains,
): ImmersveFundingChannel | null => {
  if (!isNonEmptyObject(value)) {
    logImmersveFundingFlag(
      `Immersve funding channel "${name}" is not an object`,
    );
    return null;
  }

  const { source, fundingChannelId, assetId, spenderAddress, cardProgramId } =
    value as {
      source?: unknown;
      fundingChannelId?: unknown;
      assetId?: unknown;
      spenderAddress?: unknown;
      cardProgramId?: unknown;
    };

  if (
    !isImmersveFundingSourceType(source) ||
    typeof fundingChannelId !== 'string' ||
    fundingChannelId.length === 0 ||
    typeof assetId !== 'string' ||
    assetId.length === 0 ||
    typeof spenderAddress !== 'string' ||
    spenderAddress.length === 0
  ) {
    logImmersveFundingFlag(
      `Immersve funding channel "${name}" is missing source, fundingChannelId, assetId, or spenderAddress`,
    );
    return null;
  }

  let parsed: ReturnType<typeof parseCaipAssetType>;
  try {
    parsed = parseCaipAssetType(assetId as CaipAssetType);
  } catch {
    logImmersveFundingFlag(
      `Immersve funding channel "${name}" has an invalid asset id`,
    );
    return null;
  }

  const chain = chains[parsed.chainId];
  const token = findChainToken(chain?.tokens, assetId);
  if (!chain?.network || !token || !parsed.assetReference) {
    logImmersveFundingFlag(
      `Immersve funding channel "${name}" asset ${assetId} is not in cardImmersveChains`,
    );
    return null;
  }

  return {
    source,
    fundingChannelId,
    assetId: assetId as CaipAssetType,
    spenderAddress,
    ...(typeof cardProgramId === 'string' && cardProgramId.length > 0
      ? { cardProgramId }
      : {}),
    caipChainId: parsed.chainId,
    network: chain.network,
    tokenAddress: parsed.assetReference,
    decimals: token.decimals,
    ...(token.symbol ? { symbol: token.symbol } : {}),
    ...(chain.rpcUrl ? { rpcUrl: chain.rpcUrl } : {}),
    ...(chain.fallbackRpcUrl ? { fallbackRpcUrl: chain.fallbackRpcUrl } : {}),
  };
};

/**
 * The USDC wallet channel from the top-level `network` / `fundingChannelId` /
 * `spenderAddress`. Used when `cardImmersveCountries` is a legacy string
 * array or is absent, and to recognise funding sources created by released
 * builds. An empty channel id still resolves so country routing matches
 * released builds.
 */
const buildTopLevelWalletChannel = (
  config: ImmersveProgramConfig,
  chains: CardProviderChains,
): ImmersveFundingChannel | null => {
  const configuredNetwork = config.network || DEFAULT_IMMERSVE_CONFIG.network;
  if (!configuredNetwork) {
    return null;
  }

  let token: ReturnType<typeof immersveNetworkToFundingToken>;
  try {
    token = immersveNetworkToFundingToken(configuredNetwork);
  } catch {
    return null;
  }

  const assetId = `${token.caipChainId}/erc20:${token.tokenAddress}`;
  const chain = chains[token.caipChainId];
  const chainToken = findChainToken(chain?.tokens, assetId);

  return {
    source: 'wallet',
    fundingChannelId: config.fundingChannelId ?? '',
    assetId: assetId as CaipAssetType,
    spenderAddress: config.spenderAddress ?? '',
    caipChainId: token.caipChainId as ImmersveFundingChannel['caipChainId'],
    network: chain?.network || configuredNetwork,
    tokenAddress: token.tokenAddress,
    decimals: chainToken?.decimals ?? token.decimals,
    ...(chainToken?.symbol ? { symbol: chainToken.symbol } : {}),
    ...(chain?.rpcUrl ? { rpcUrl: chain.rpcUrl } : {}),
    ...(chain?.fallbackRpcUrl ? { fallbackRpcUrl: chain.fallbackRpcUrl } : {}),
  };
};

const readImmersveFundingFlags = (flags: CardRemoteFeatureFlags) => ({
  config: readCardProviderConfig<ImmersveProgramConfig>(
    flags,
    CardProviderIds.Immersve,
  ),
  chains: readCardProviderChains(flags, CardProviderIds.Immersve),
});

const resolveNamedFundingChannels = (
  config: ImmersveProgramConfig,
  chains: CardProviderChains,
): Record<string, ImmersveFundingChannel> => {
  const resolved: Record<string, ImmersveFundingChannel> = {};
  if (!isNonEmptyObject(config.fundingChannels)) {
    return resolved;
  }
  for (const [name, value] of Object.entries(config.fundingChannels)) {
    const channel = sanitizeFundingChannel(name, value, chains);
    if (channel) {
      resolved[name] = channel;
    }
  }
  return resolved;
};

/** True when the channel spends from the Money account. */
export function isMoneyAccountFundingChannel<T extends { source: string }>(
  channel: T | null | undefined,
): channel is T & { source: 'moneyAccount' } {
  return channel?.source === 'moneyAccount';
}

/**
 * Channel name -> resolved channel, from `cardImmersveConfig.fundingChannels`.
 * Incomplete entries and entries whose asset is missing from
 * `cardImmersveChains` are dropped.
 */
export function readImmersveFundingChannels(
  flags: CardRemoteFeatureFlags,
): Record<string, ImmersveFundingChannel> {
  const { config, chains } = readImmersveFundingFlags(flags);
  return resolveNamedFundingChannels(config, chains);
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

/**
 * One object entry of `cardImmersveCountries`. Returns null when
 * `fundingChannel` is missing or `minimumVersion` is present but not a string.
 */
const parseImmersveCountryConfig = (
  value: unknown,
): { fundingChannel: string; minimumVersion?: string } | null => {
  if (!isRecord(value) || typeof value.fundingChannel !== 'string') {
    return null;
  }
  const { fundingChannel, minimumVersion } = value;
  if (fundingChannel.length === 0) {
    return null;
  }
  if (minimumVersion !== undefined && typeof minimumVersion !== 'string') {
    return null;
  }
  return {
    fundingChannel,
    ...(typeof minimumVersion === 'string' && minimumVersion.length > 0
      ? { minimumVersion }
      : {}),
  };
};

/**
 * Country code -> funding channel, from `cardImmersveCountries`.
 *
 * An object maps each country to a named channel in `fundingChannels`. A
 * country below its `minimumVersion`, with a `minimumVersion` that is not a
 * version, or whose channel does not resolve, is dropped. A legacy string
 * array, and a missing or invalid value, use the top-level wallet channel
 * (defaulting to GB when the value is not a list).
 */
export function readImmersveCountryFunding(
  flags: CardRemoteFeatureFlags,
): Record<string, ImmersveFundingChannel> {
  const { config, chains } = readImmersveFundingFlags(flags);
  const raw = flags?.[CARD_PROVIDER_FLAGS[CardProviderIds.Immersve].countries];

  if (isRecord(raw)) {
    const channels = resolveNamedFundingChannels(config, chains);
    const countryFunding: Record<string, ImmersveFundingChannel> = {};
    for (const [country, value] of Object.entries(raw)) {
      const normalized = country.toUpperCase();
      const entry = parseImmersveCountryConfig(value);
      if (!entry) {
        logImmersveFundingFlag(
          `Immersve country ${normalized} is missing a funding channel`,
        );
        continue;
      }
      if (entry.minimumVersion) {
        let meetsMinimum = false;
        try {
          meetsMinimum = hasMinimumRequiredVersion(entry.minimumVersion);
        } catch {
          logImmersveFundingFlag(
            `Immersve country ${normalized} has an invalid minimumVersion`,
          );
          continue;
        }
        if (!meetsMinimum) {
          continue;
        }
      }
      const channel = channels[entry.fundingChannel];
      if (!channel) {
        logImmersveFundingFlag(
          `Immersve country ${normalized} does not map to a resolved funding channel`,
        );
        continue;
      }
      countryFunding[normalized] = channel;
    }
    return countryFunding;
  }

  const countries = isStringArray(raw) ? raw : DEFAULT_IMMERSVE_COUNTRIES;
  const topLevel = buildTopLevelWalletChannel(config, chains);
  if (!topLevel) {
    return {};
  }
  return Object.fromEntries(
    countries.map((country) => [country.toUpperCase(), topLevel]),
  );
}

/**
 * Looks up a country in an already-built funding map. Callers that already
 * hold the memoized map should use this instead of rebuilding it.
 */
export function immersveFundingChannelForCountry(
  countryFunding: Record<string, ImmersveFundingChannel> | null | undefined,
  country: string | null | undefined,
): ImmersveFundingChannel | null {
  if (!country || !countryFunding) {
    return null;
  }
  return countryFunding[country.toUpperCase()] ?? null;
}

/** Funding channel for `country`, or null when Immersve does not claim it. */
export function resolveImmersveFundingChannel(
  flags: CardRemoteFeatureFlags,
  country: string | null | undefined,
): ImmersveFundingChannel | null {
  return immersveFundingChannelForCountry(
    readImmersveCountryFunding(flags),
    country,
  );
}

/**
 * Channel whose Immersve id matches a funding source. A card can spend from a
 * channel other than the one the selected country would create.
 */
export function findImmersveFundingChannelById(
  flags: CardRemoteFeatureFlags,
  fundingChannelId: string | null | undefined,
): ImmersveFundingChannel | null {
  if (!fundingChannelId) {
    return null;
  }
  const { config, chains } = readImmersveFundingFlags(flags);
  const named = Object.values(resolveNamedFundingChannels(config, chains)).find(
    (channel) => channel.fundingChannelId === fundingChannelId,
  );
  if (named) {
    return named;
  }
  const topLevel = buildTopLevelWalletChannel(config, chains);
  return topLevel?.fundingChannelId === fundingChannelId ? topLevel : null;
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

const keepProvisioningWallet = (
  wallet: ProvisioningWallet,
  platformRule: Record<string, unknown>,
  countryEligibility: unknown,
  cardProcessor: string | undefined,
  allowed: readonly ProvisioningWallet[],
  implementedWallets: readonly ProvisioningWallet[],
): ResolvedProvisioningWallet | null => {
  if (!allowed.includes(wallet) || !implementedWallets.includes(wallet)) {
    return null;
  }
  const leaf = platformRule[wallet];
  if (!isWalletLeaf(leaf)) {
    return null;
  }
  if (
    validatedVersionGatedFeatureFlag({
      enabled: leaf.enabled,
      minimumVersion: leaf.minimumVersion,
    }) !== true
  ) {
    return null;
  }
  if (!eligibilityPasses(countryEligibility, leaf.eligibility, cardProcessor)) {
    return null;
  }
  if (wallet !== 'samsung_pay') {
    return { wallet };
  }
  const devices = readSamsungDevices(leaf);
  return devices ? { wallet, devices } : null;
};

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
    const resolved = keepProvisioningWallet(
      wallet,
      platformRule,
      countryRule.eligibility,
      facts.cardProcessor,
      allowed,
      implementedWallets,
    );
    if (resolved) {
      kept.push(resolved);
    }
  }

  return kept.length > 0 ? kept : NO_PROVISIONING_WALLETS;
}
