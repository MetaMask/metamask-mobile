/* eslint-disable @metamask/design-tokens/color-no-hex */

/**
 * Background colors used by each provider's iframe/webview in dark and light mode.
 * These are set by the provider and outside our control — we match them in the
 * BottomSheet surface so the native chrome feels seamless with the embedded checkout.
 *
 * Add or update entries here when a provider's iframe background changes.
 * Keys are lowercase substrings of the provider ID returned by the ramps controller
 * (e.g. "transak" matches both "transak" and "transak-native").
 *
 * Use undefined colors to fall back to the design-system default surface.
 * TODO: verify dark/light values visually in the simulator for each provider below.
 */

export interface ProviderWebviewColors {
  dark: string;
  light: string;
}

const PROVIDER_WEBVIEW_COLORS: Record<string, ProviderWebviewColors> = {
  transak: { dark: '#1a1a1a', light: '#ffffff' },
  // moonpay: { dark: '???', light: '???' },
  // banxa: { dark: '???', light: '???' },
  // sardine: { dark: '???', light: '???' },
  // stripe: { dark: '???', light: '???' },
  // paypal: { dark: '???', light: '???' },
};

/**
 * Returns the provider's iframe background colors for the given provider ID,
 * or undefined if unknown (caller should fall back to the design-system surface).
 */
export function getProviderWebviewColors(
  providerCode: string | undefined,
): ProviderWebviewColors | undefined {
  if (!providerCode) return undefined;
  const lower = providerCode.toLowerCase();
  const key = Object.keys(PROVIDER_WEBVIEW_COLORS).find((k) =>
    lower.includes(k),
  );
  return key ? PROVIDER_WEBVIEW_COLORS[key] : undefined;
}
