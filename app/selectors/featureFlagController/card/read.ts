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
} from './defaults';
import type {
  CardFeatureFlag,
  CardProviderChain,
  CardProviderChains,
  CardProviderFlagKeys,
  CardProviderTokenConfig,
  ImmersveProgramConfig,
} from './types';

/**
 * Raw `RemoteFeatureFlagController.remoteFeatureFlags`. Readers take this
 * rather than `RootState` so `CardController` — which reaches flags through
 * `messenger.call('RemoteFeatureFlagController:getState')` and cannot use
 * reselect — runs the exact same resolution as the UI selectors.
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

/**
 * Whether a provider is available.
 *
 * Resolution order: the `card<Provider>` switch (version-gated, and
 * rollout-wrapper aware) -> the local env override -> false.
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
