/**
 * Callback base URL for ramp quote/order redirects.
 * Kept in sync with Aggregator/sdk callbackBaseUrl but defined here so the
 * unified BuildQuote flow does not import the legacy aggregator SDK (which
 * has top-level initialization side effects).
 */
const RAMP_CALLBACK_URL_PRODUCTION =
  'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback';
const RAMP_CALLBACK_URL_STAGING =
  'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback';

export function getRampCallbackBaseUrl(): string {
  const env = process.env.METAMASK_ENVIRONMENT;
  switch (env) {
    case 'production':
    case 'beta':
    case 'rc':
      return RAMP_CALLBACK_URL_PRODUCTION;
    default:
      return RAMP_CALLBACK_URL_STAGING;
  }
}
