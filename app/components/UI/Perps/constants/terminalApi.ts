/**
 * MetaMask Terminal API configuration for perps market data.
 * Terminal API is the preferred source; the controller falls back to HyperLiquid
 * automatically when Terminal is unavailable.
 *
 * Whether to route through Terminal API is controlled by the versioned remote
 * feature flag `perpsTerminalBackendEnabled` — see
 * `selectPerpsTerminalBackendEnabledFlag` in selectors/featureFlags.
 */

export const TERMINAL_API_URLS = {
  DEV: 'https://terminal.dev-api.cx.metamask.io/v1/perpetuals',
  UAT: 'https://terminal.uat-api.cx.metamask.io/v1/perpetuals',
  PRD: 'https://terminal.api.cx.metamask.io/v1/perpetuals',
} as const;

export const TERMINAL_GLOBAL_SNAPSHOT_DATA_SOURCE =
  'terminal-global-snapshot-mark';

/** Resolves the existing Terminal market-data URL for a Mobile build. */
export function resolveTerminalApiUrl(
  environment: string | undefined,
  buildType: string | undefined,
): string {
  if (
    environment === 'dev' ||
    environment === 'test' ||
    environment === 'e2e'
  ) {
    return TERMINAL_API_URLS.DEV;
  }
  if (buildType === 'beta') {
    return TERMINAL_API_URLS.UAT;
  }
  if (
    environment === 'production' ||
    environment === 'rc' ||
    environment === 'rc-nightly'
  ) {
    return TERMINAL_API_URLS.PRD;
  }
  return TERMINAL_API_URLS.UAT;
}

/** Resolves the v2 global-snapshot URL, allowing an explicit dev-only override. */
export function resolveTerminalGlobalSnapshotUrl({
  isDevBundle,
  environment,
  endpoint,
  marketDataUrl,
}: {
  isDevBundle: boolean;
  environment: string | undefined;
  endpoint: string | undefined;
  marketDataUrl: string;
}): string {
  if (isDevBundle && environment === 'dev' && endpoint?.trim()) {
    return endpoint.trim();
  }

  return marketDataUrl.replace('/v1/perpetuals', '/v2/perpetuals');
}

/** Resolves the runtime v2 global-snapshot URL from the market-data host. */
export function getTerminalGlobalSnapshotUrl(
  marketDataUrl = resolveTerminalApiUrl(
    process.env.METAMASK_ENVIRONMENT,
    process.env.METAMASK_BUILD_TYPE,
  ),
): string {
  return resolveTerminalGlobalSnapshotUrl({
    isDevBundle: __DEV__,
    environment: process.env.METAMASK_ENVIRONMENT,
    endpoint: process.env.MM_PERPS_TERMINAL_GLOBAL_SNAPSHOT_URL,
    marketDataUrl,
  });
}
