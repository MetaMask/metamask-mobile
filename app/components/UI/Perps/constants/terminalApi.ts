/**
 * MetaMask Terminal API configuration for perps market data.
 * Terminal API is the preferred source; the controller falls back to HyperLiquid
 * automatically when Terminal is unavailable.
 */

export const TERMINAL_API_URLS = {
  DEV: 'https://terminal.dev-api.cx.metamask.io',
  UAT: 'https://terminal.uat-api.cx.metamask.io',
  PRD: 'https://terminal.api.cx.metamask.io',
} as const;

/**
 * Passed to controller market-data calls to route through Terminal API.
 * The controller handles HyperLiquid fallback internally — no feature flag
 * is needed at the UI layer.
 */
export const USE_TERMINAL_API = true;
