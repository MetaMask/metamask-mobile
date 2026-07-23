/* eslint-disable @metamask/design-tokens/color-no-hex */

/**
 * ============================================================
 * CUSTOM COLOR REGISTRY — READ BEFORE ADDING ANYTHING HERE
 * ============================================================
 *
 * This file is the ONE permitted home for custom hex colors in the app.
 * The eslint-disable above exists ONLY for this file.
 *
 * 🚨 IF YOU ARE ABOUT TO ADD A COLOR HERE, TREAT IT AS A RED FLAG.
 *
 * Stop. Push back on the designer. If a custom color is showing up in
 * a design spec, that is a signal the design system may have a gap —
 * raise it in Slack at #metamask-design-system before merging.
 *
 * ⚠️ Custom hex colors MUST be a last resort. Before adding a new value:
 *
 * 1. DESIGN TOKENS first — `useTheme().colors.*` covers almost all UI.
 * See @metamask/design-tokens for the full token catalogue.
 *
 * 2. BRAND COLORS second — `brandColor.*` from @metamask/design-tokens
 * provides the MetaMask brand palette and is already theme-aware.
 * Reach for these before inventing a new hex value.
 *
 * 3. ONLY add a raw hex here when no token or brand color exists AND
 * the value is dictated by a third-party spec (Apple HIG, a provider's
 * iframe chrome, a partner's brand mark, chart indicator series, etc.).
 * Add a comment on the entry explaining exactly why no token applies.
 *
 * Adding a hex color to bypass design-system constraints is NOT acceptable.
 *
 * Note: `eslint-disable @metamask/design-tokens/color-no-hex` is also
 * legitimate in SVG and image asset files where hex values are part of
 * the asset definition, not UI styling. It must NOT appear in component,
 * style, or utility files — add the color here and import it instead.
 * ============================================================
 */

/**
 * Theme-invariant brand/product colors.
 *
 * Use for third-party brand marks, payment buttons, and provider iframe
 * backgrounds — values that must not change with the user's color scheme.
 * Do not add semantic UI colors here; use design-system tokens instead.
 */
export const staticColors = {
  white: '#FFFFFF',
  // Apple Pay — do not change unless noted by Apple HIG:
  // https://developer.apple.com/design/human-interface-guidelines/apple-pay
  applePayBlack: '#000000',
  applePayWhite: '#FFFFFF',
  telegramBlue: '#29B6F6',
  btnBlack: '#1C1E21',
  btnBlackText: '#FFFFFF',
  modalScrollButton: '#ECEEFF',
  // Provider iframe chrome backgrounds — these colors are set by each
  // provider and outside our control. We match them so the native chrome
  // feels seamless with the embedded webview. Update only if a provider
  // changes their iframe theme colors.
  transakCheckoutDark: '#1a1a1a',
  moonpayCheckoutDark: '#131416',
  banxaCheckoutDark: '#0D0D0F',
  // Onboarding carousel — brand accent pairs per slide (theme-invariant)
  onboardingCarousel: {
    one: { color: '#190066', background: '#E5FFC3' },
    two: { color: '#3D065F', background: '#FFA680' },
    three: { color: '#190066', background: '#CCE7FF' },
  },
} as const;

/**
 * Theme-variant custom colors.
 *
 * Keyed by `'light'` and `'dark'` (matching `AppThemeKey`). When a
 * design-system token is sufficient for one mode, set that entry to `null`
 * and fall back to the token at the callsite.
 *
 * Access via `useCustomColors()` in functional components, or index directly
 * with `themeAppearance` for class components and non-hook contexts.
 */
export const customColors = {
  light: {
    // design-token success.default (#457a39) is too faint on a light
    // background for charts and price indicators — use this darker green.
    successGreen: '#00881A',
    gettingStartedBackground: '#FFF2EB',
    gettingStartedText: '#3D065F',
  },
  dark: {
    successGreen: null as null, // fall back to colors.success.default
    gettingStartedBackground: '#EAC2FF',
    gettingStartedText: '#3D065F',
  },
} as const;

export type CustomColorSet =
  | typeof customColors.light
  | typeof customColors.dark;
