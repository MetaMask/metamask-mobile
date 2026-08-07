import { getDefaultRedirectCallbackUrl } from '@metamask/ramps-controller';

import { getRampsEnvironment } from '../../../../core/Engine/controllers/ramps-controller/ramps-service-init';

/**
 * Callback base URL for ramp quote/order redirects (UNIFIED_BUY_2).
 *
 * Thin wrapper around core's canonical environment-to-callback map so BuildQuote,
 * Checkout completion detection, Continue rewrite, and the controller's widened
 * default all resolve from the same `getRampsEnvironment()` source (which honors
 * `RAMPS_ENVIRONMENT` from builds.yml, then `METAMASK_ENVIRONMENT`).
 */
export function getRampCallbackBaseUrl(): string {
  return getDefaultRedirectCallbackUrl(getRampsEnvironment());
}
