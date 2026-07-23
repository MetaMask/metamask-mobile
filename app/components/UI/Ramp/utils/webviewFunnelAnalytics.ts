import type { RampSurface } from '../types/depositAnalytics';
import { redactUrlForAnalytics } from './redactUrlForAnalytics';

export type CloseSource =
  | 'user_close_button'
  | 'callback_success'
  | 'callback_error'
  | 'http_error'
  | 'background'
  /** External-browser checkout: user closed the iOS auth sheet (P2.M7). */
  | 'external_browser_cancel';

export interface FunnelBaseProps {
  checkout_session_id: string;
  location: 'Checkout';
  ramp_type: 'UNIFIED_BUY_2' | 'HEADLESS';
  ramp_surface?: RampSurface;
  region?: string;
  provider_name?: string;
}

export interface BuildBaseArgs {
  checkoutSessionId: string;
  providerName?: string;
  /**
   * Headless deposit overrides (TRAM-3623). When a `headlessSessionId` drives
   * the Checkout, the host passes `rampType: 'HEADLESS'` plus the seeded
   * `rampSurface`/`region` so every webview funnel event is tagged
   * consistently. Defaults keep the UB2 behavior (`UNIFIED_BUY_2`, no surface)
   * so non-headless callers are unchanged.
   */
  rampType?: 'UNIFIED_BUY_2' | 'HEADLESS';
  rampSurface?: RampSurface;
  region?: string;
}

export const buildBaseProps = ({
  checkoutSessionId,
  providerName,
  rampType = 'UNIFIED_BUY_2',
  rampSurface,
  region,
}: BuildBaseArgs): FunnelBaseProps => ({
  checkout_session_id: checkoutSessionId,
  location: 'Checkout',
  ramp_type: rampType,
  ramp_surface: rampSurface,
  region,
  provider_name: providerName ?? undefined,
});

export const extractHostname = (url: string): string | undefined => {
  try {
    return new URL(redactUrlForAnalytics(url)).hostname;
  } catch {
    return undefined;
  }
};
