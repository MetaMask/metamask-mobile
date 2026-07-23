/**
 * Callback base URL for ramp quote/order redirects (UNIFIED_BUY_2).
 * Defined here so the unified BuildQuote / Checkout flow does not import the
 * legacy aggregator SDK (which has top-level initialization side effects).
 *
 * Production/staging use the on-ramp-content hosts (same as Aggregator).
 * Mobile `dev` uses the RAM Dev API host because there is no
 * `on-ramp-content.dev-api` deployment; `/regions/fake-callback` is served
 * from `on-ramp.dev-api` and returns 200.
 */
const RAMP_CALLBACK_URL_PRODUCTION =
  'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback';
const RAMP_CALLBACK_URL_STAGING =
  'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback';
const RAMP_CALLBACK_URL_DEVELOPMENT =
  'https://on-ramp.dev-api.cx.metamask.io/regions/fake-callback';

export function getRampCallbackBaseUrl(): string {
  const env = process.env.METAMASK_ENVIRONMENT;
  switch (env) {
    case 'production':
    case 'beta':
    case 'rc':
      return RAMP_CALLBACK_URL_PRODUCTION;
    case 'dev':
      return RAMP_CALLBACK_URL_DEVELOPMENT;
    default:
      return RAMP_CALLBACK_URL_STAGING;
  }
}
