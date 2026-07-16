import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
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
 * The "default" entry mirrors the MMDS BottomSheet surface colors and is used
 * when no provider-specific color is known.
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
  // Defaults to MMDS BottomSheet surface colors when no provider-specific
  // color is known, ensuring the WebView background always matches the sheet.
  default: {
    dark: darkTheme.colors.background.alternative,
    light: lightTheme.colors.background.default,
  },
  transak: { dark: colors.transakCheckoutDark, light: brandColor.white },
  moonpay: { dark: colors.moonpayCheckoutDark, light: brandColor.white },
  banxa: { dark: colors.banxaCheckoutDark, light: brandColor.white },
};

/**
 * Returns the provider's iframe background colors for the given provider ID.
 * Falls back to the MMDS BottomSheet default surface for unknown providers.
 */
export function getProviderWebviewColors(
  providerCode: string | undefined,
): ProviderWebviewColors {
  if (!providerCode) return PROVIDER_WEBVIEW_COLORS.default;
  const lower = providerCode.toLowerCase();
  const key = Object.keys(PROVIDER_WEBVIEW_COLORS).find(
    (k) => k !== 'default' && lower.includes(k),
  );
  return PROVIDER_WEBVIEW_COLORS[key ?? 'default'];
}
