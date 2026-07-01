import { Hex, isStrictHexString } from '@metamask/utils';

/**
 * Types + helpers for the `confirmations_relay_fixed_spread` remote feature flag.
 */

export interface RelayFixedSpreadRoute {
  sourceChain: Hex;
  sourceToken: Hex;
  targetChain: Hex;
  targetToken: Hex;
}

export interface RelayFixedSpreadConfig {
  routes: RelayFixedSpreadRoute[];
}

export const EMPTY_RELAY_FIXED_SPREAD_CONFIG: RelayFixedSpreadConfig = {
  routes: [],
};

const EXPECTED_FORMAT =
  'Expected format: {"chains":{"eth":"0x1"},"tokens":{"musd":"0x..."},"routes":[["eth","musd","eth","musd"]]}';

const isStringRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const buildAliasMap = (raw: unknown): Map<string, Hex> | null => {
  if (!isStringRecord(raw)) return null;
  const map = new Map<string, Hex>();
  for (const [alias, value] of Object.entries(raw)) {
    if (!isStrictHexString(value)) continue;
    map.set(alias, value.toLowerCase() as Hex);
  }
  return map;
};

interface ResolvedRouteBase {
  srcTokenAlias: string;
  dstTokenAlias: string;
  sourceChain: Hex;
  sourceToken: Hex;
  targetChain: Hex;
  targetToken: Hex;
}

const resolveRouteBase = (
  tuple: unknown,
  chains: Map<string, Hex>,
  tokens: Map<string, Hex>,
): ResolvedRouteBase | null => {
  if (!Array.isArray(tuple) || tuple.length !== 4) return null;
  const [srcChainAlias, srcTokenAlias, dstChainAlias, dstTokenAlias] = tuple;
  if (
    typeof srcChainAlias !== 'string' ||
    typeof srcTokenAlias !== 'string' ||
    typeof dstChainAlias !== 'string' ||
    typeof dstTokenAlias !== 'string'
  ) {
    return null;
  }
  const sourceChain = chains.get(srcChainAlias);
  const sourceToken = tokens.get(srcTokenAlias);
  const targetChain = chains.get(dstChainAlias);
  const targetToken = tokens.get(dstTokenAlias);
  if (!sourceChain || !sourceToken || !targetChain || !targetToken) {
    return null;
  }
  return {
    srcTokenAlias,
    dstTokenAlias,
    sourceChain,
    sourceToken,
    targetChain,
    targetToken,
  };
};

const resolveRoute = (
  tuple: unknown,
  chains: Map<string, Hex>,
  tokens: Map<string, Hex>,
): RelayFixedSpreadRoute | null => {
  const base = resolveRouteBase(tuple, chains, tokens);
  if (!base) return null;
  return {
    sourceChain: base.sourceChain,
    sourceToken: base.sourceToken,
    targetChain: base.targetChain,
    targetToken: base.targetToken,
  };
};

const tryJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const extractRoutes = (value: unknown): RelayFixedSpreadRoute[] | null => {
  if (!isStringRecord(value)) return null;
  const chains = buildAliasMap(value.chains);
  const tokens = buildAliasMap(value.tokens);
  const routes = value.routes;
  if (!chains || !tokens || !Array.isArray(routes)) return null;
  return routes
    .map((tuple) => resolveRoute(tuple, chains, tokens))
    .filter((route): route is RelayFixedSpreadRoute => route !== null);
};

/**
 * Parses a `confirmations_relay_fixed_spread` remote flag value into a
 * normalised, lowercased {@link RelayFixedSpreadConfig}. Invalid entries are
 * silently dropped; a fully invalid payload yields {@link EMPTY_RELAY_FIXED_SPREAD_CONFIG}.
 *
 * Empty/missing payloads are the desired "feature off" state and produce no
 * warning. Local override during development is done via the existing
 * `OVERRIDE_REMOTE_FEATURE_FLAGS` mechanism rather than a dedicated env var.
 */
export const getRelayFixedSpreadFromConfig = (
  remoteValue: unknown,
  remoteFlagName: string,
): RelayFixedSpreadConfig => {
  if (remoteValue === undefined || remoteValue === null || remoteValue === '') {
    return EMPTY_RELAY_FIXED_SPREAD_CONFIG;
  }

  const parsed =
    typeof remoteValue === 'string' ? tryJsonParse(remoteValue) : remoteValue;
  if (parsed === null) {
    console.warn(`Failed to parse remote ${remoteFlagName}: invalid JSON.`);
    return EMPTY_RELAY_FIXED_SPREAD_CONFIG;
  }

  const routes = extractRoutes(parsed);
  if (routes === null) {
    console.warn(
      `Remote ${remoteFlagName} produced invalid structure. ${EXPECTED_FORMAT}`,
    );
    return EMPTY_RELAY_FIXED_SPREAD_CONFIG;
  }

  return { routes };
};

/**
 * Like {@link RelayFixedSpreadRoute} but preserves the original token alias keys
 * (e.g. `eth_usdc`) alongside the resolved addresses. Consumers that need the
 * human-facing token symbols (which {@link getRelayFixedSpreadFromConfig}
 * discards) use this shape.
 */
export interface RelayFixedSpreadAliasRoute {
  sourceChain: Hex;
  sourceTokenAlias: string;
  sourceToken: Hex;
  targetChain: Hex;
  targetTokenAlias: string;
  targetToken: Hex;
}

const resolveRouteWithSymbols = (
  tuple: unknown,
  chains: Map<string, Hex>,
  tokens: Map<string, Hex>,
): RelayFixedSpreadAliasRoute | null => {
  const base = resolveRouteBase(tuple, chains, tokens);
  if (!base) return null;
  return {
    sourceChain: base.sourceChain,
    sourceTokenAlias: base.srcTokenAlias,
    sourceToken: base.sourceToken,
    targetChain: base.targetChain,
    targetTokenAlias: base.dstTokenAlias,
    targetToken: base.targetToken,
  };
};

/**
 * Parses a `confirmations_relay_fixed_spread` remote flag value into a list of
 * routes that retain their token alias keys. Unlike
 * {@link getRelayFixedSpreadFromConfig}, the alias (and therefore the token
 * symbol) is preserved for consumers that render token symbols. Invalid entries
 * are dropped; an invalid/empty payload yields an empty array.
 */
export const getRelayFixedSpreadRoutesWithSymbols = (
  remoteValue: unknown,
  remoteFlagName: string,
): RelayFixedSpreadAliasRoute[] => {
  if (remoteValue === undefined || remoteValue === null || remoteValue === '') {
    return [];
  }

  const parsed =
    typeof remoteValue === 'string' ? tryJsonParse(remoteValue) : remoteValue;
  if (!isStringRecord(parsed)) {
    console.warn(`Failed to parse remote ${remoteFlagName}: invalid JSON.`);
    return [];
  }

  const chains = buildAliasMap(parsed.chains);
  const tokens = buildAliasMap(parsed.tokens);
  const routes = parsed.routes;
  if (!chains || !tokens || !Array.isArray(routes)) {
    console.warn(
      `Remote ${remoteFlagName} produced invalid structure. ${EXPECTED_FORMAT}`,
    );
    return [];
  }

  return routes
    .map((tuple) => resolveRouteWithSymbols(tuple, chains, tokens))
    .filter((route): route is RelayFixedSpreadAliasRoute => route !== null);
};

const addressesEqual = (
  a: string | undefined,
  b: string | undefined,
): boolean => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export interface RouteEndpoint {
  chainId: string;
  address: string;
}

/**
 * Returns true when at least one route in {@link config} has a source matching
 * `(chainId, address)`. Used by the "no fee" tag when the consumer does not
 * yet have a directional target.
 */
export const isSubsidizedSource = (
  config: RelayFixedSpreadConfig,
  source: RouteEndpoint,
): boolean =>
  config.routes.some(
    (route) =>
      addressesEqual(route.sourceChain, source.chainId) &&
      addressesEqual(route.sourceToken, source.address),
  );

/**
 * Returns true when {@link config} contains an exact `(source → target)` route.
 * Reserved for callsites that know the destination of the transaction being
 * built; not yet wired in to the MM Pay picker.
 */
export const isSubsidizedRoute = (
  config: RelayFixedSpreadConfig,
  source: RouteEndpoint,
  target: RouteEndpoint,
): boolean =>
  config.routes.some(
    (route) =>
      addressesEqual(route.sourceChain, source.chainId) &&
      addressesEqual(route.sourceToken, source.address) &&
      addressesEqual(route.targetChain, target.chainId) &&
      addressesEqual(route.targetToken, target.address),
  );
