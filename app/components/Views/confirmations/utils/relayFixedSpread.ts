import { Hex } from '@metamask/utils';

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
  'Expected format: {"routes":[{"sourceChain":"0x1","sourceToken":"0x...","targetChain":"0x1","targetToken":"0x..."}]}';

const HEX_PATTERN = /^0x[0-9a-fA-F]+$/;

const isHex = (value: unknown): value is Hex =>
  typeof value === 'string' && HEX_PATTERN.test(value);

const toLowerHex = (value: Hex): Hex => value.toLowerCase() as Hex;

const normalizeRoute = (raw: unknown): RelayFixedSpreadRoute | null => {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (
    !isHex(candidate.sourceChain) ||
    !isHex(candidate.sourceToken) ||
    !isHex(candidate.targetChain) ||
    !isHex(candidate.targetToken)
  ) {
    return null;
  }
  return {
    sourceChain: toLowerHex(candidate.sourceChain),
    sourceToken: toLowerHex(candidate.sourceToken),
    targetChain: toLowerHex(candidate.targetChain),
    targetToken: toLowerHex(candidate.targetToken),
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
  if (!value || typeof value !== 'object') return null;
  const routes = (value as { routes?: unknown }).routes;
  if (!Array.isArray(routes)) return null;
  return routes
    .map(normalizeRoute)
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
