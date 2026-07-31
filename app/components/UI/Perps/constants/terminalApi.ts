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
