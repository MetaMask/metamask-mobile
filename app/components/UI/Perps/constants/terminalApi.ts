/**
 * MetaMask Terminal API configuration for perps market data.
 * Terminal API is the preferred source; the controller falls back to HyperLiquid
 * automatically when Terminal is unavailable.
 *
 * Whether to route through Terminal API is controlled by the versioned remote
 * feature flag `perpsTerminalBackendEnabled` — see
 * `selectPerpsTerminalBackendEnabledFlag` in selectors/featureFlags.
 */

export const TERMINAL_API_HOSTS = {
  DEV: 'https://terminal.dev-api.cx.metamask.io',
  UAT: 'https://terminal.uat-api.cx.metamask.io',
  PRD: 'https://terminal.api.cx.metamask.io',
} as const;

export const TERMINAL_API_PATHS = {
  MARKET_DATA: '/v1/perpetuals',
  GLOBAL_SNAPSHOT: '/v2/perpetuals',
  OUTREACH: '/v1/outreach',
} as const;

export const TERMINAL_GLOBAL_SNAPSHOT_DATA_SOURCE =
  'terminal-global-snapshot-mark';

function terminalUrl(host: string, path: string): string {
  return `${host}${path}`;
}

function currentTerminalHost(): string {
  return resolveTerminalApiHost(
    // babel-plugin-transform-inline-environment-variables rewrites
    // process.env.FOO at transform time. Bracket access keeps runtime reads.
    // eslint-disable-next-line dot-notation
    process.env['METAMASK_ENVIRONMENT'],
    // eslint-disable-next-line dot-notation
    process.env['METAMASK_BUILD_TYPE'],
  );
}

/**
 * Resolves the Terminal host for a Mobile build.
 *
 * Mapping:
 * - dev / test / e2e → DEV (takes priority over beta build type)
 * - beta build type (non-dev envs) → UAT
 * - production / rc → PRD
 * - all other environments (local, undefined, etc.) → UAT
 */
export function resolveTerminalApiHost(
  environment: string | undefined,
  buildType: string | undefined,
): string {
  if (
    environment === 'dev' ||
    environment === 'test' ||
    environment === 'e2e'
  ) {
    return TERMINAL_API_HOSTS.DEV;
  }
  if (buildType === 'beta') {
    return TERMINAL_API_HOSTS.UAT;
  }
  if (environment === 'production' || environment === 'rc') {
    return TERMINAL_API_HOSTS.PRD;
  }
  return TERMINAL_API_HOSTS.UAT;
}

/** Resolves the v2 global-snapshot URL, allowing an explicit dev-only override. */
export function resolveTerminalGlobalSnapshotUrl({
  isDevBundle,
  environment,
  endpoint,
  host,
}: {
  isDevBundle: boolean;
  environment: string | undefined;
  endpoint: string | undefined;
  host: string;
}): string {
  if (isDevBundle && environment === 'dev' && endpoint?.trim()) {
    return endpoint.trim();
  }

  return terminalUrl(host, TERMINAL_API_PATHS.GLOBAL_SNAPSHOT);
}

/** Resolves the runtime v1 market-data URL for the current Mobile build. */
export function getTerminalApiUrl(host?: string): string {
  return terminalUrl(
    host ?? currentTerminalHost(),
    TERMINAL_API_PATHS.MARKET_DATA,
  );
}

/** Resolves the runtime v2 global-snapshot URL from the Terminal host. */
export function getTerminalGlobalSnapshotUrl(host?: string): string {
  return resolveTerminalGlobalSnapshotUrl({
    isDevBundle: __DEV__,
    // eslint-disable-next-line dot-notation
    environment: process.env['METAMASK_ENVIRONMENT'],
    // eslint-disable-next-line dot-notation
    endpoint: process.env['MM_PERPS_TERMINAL_GLOBAL_SNAPSHOT_URL'],
    host: host ?? currentTerminalHost(),
  });
}

/** Resolves the runtime outreach URL for the current Mobile build. */
export function getTerminalOutreachUrl(host?: string): string {
  return terminalUrl(
    host ?? currentTerminalHost(),
    TERMINAL_API_PATHS.OUTREACH,
  );
}
