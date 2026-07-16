import { brandColor } from '@metamask/design-tokens';
import { colors } from '../../../../styles/common';

/**
 * Background colors used by each provider's iframe/webview in dark and light mode.
 * These are set by the provider and outside our control — we match them in the
 * BottomSheet surface so the native chrome feels seamless with the embedded checkout.
 *
 * Add or update entries here when a provider's iframe background changes.
 * Keys are lowercase substrings of the provider ID returned by the ramps controller
 * (e.g. "transak" matches both "transak" and "transak-native").
 *
 * Providers not listed here fall back to the design-system default surface.
 */

export interface ProviderWebviewColors {
  dark: string;
  light: string;
}

// Intentionally overrides the design-system BottomSheet background to match
// each provider's iframe, which we cannot style. Keeps the native chrome
// seamless with the embedded checkout flow. See colors.*CheckoutDark in
// app/styles/common.ts. Update only if a provider changes their iframe theme.
const PROVIDER_WEBVIEW_COLORS: Record<string, ProviderWebviewColors> = {
  transak: { dark: colors.transakCheckoutDark, light: brandColor.white },
  moonpay: { dark: colors.moonpayCheckoutDark, light: brandColor.white },
  banxa: { dark: colors.banxaCheckoutDark, light: brandColor.white },
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
