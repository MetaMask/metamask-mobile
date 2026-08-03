/**
 * Shared, platform-agnostic types for the widgets foundation (`app/core/Widgets/`).
 *
 * IMPORTANT: everything in this file must stay free of native imports
 * (`expo-widgets`, `@expo/ui`) and must remain plain, JSON-serializable data.
 * These types describe values that get passed as *props* into `'widget'`
 * directive functions, which cannot close over module-scope variables — see
 * docs/widgets/README.md for why.
 */

/** Matches WidgetKit's `colorScheme` environment value. */
export type WidgetColorScheme = 'light' | 'dark';

/**
 * Subset of SwiftUI's `Font.Weight` that `@metamask/design-tokens` typography
 * weights map onto. Intentionally excludes ultraLight/thin/light/heavy/black —
 * the design system only defines regular/medium/bold.
 */
export type WidgetFontWeight = 'regular' | 'medium' | 'bold';

export interface WidgetTypographyStyle {
  /** Font size in points, ready to pass to `@expo/ui/swift-ui/modifiers`' `font({ size })`. */
  size: number;
  weight: WidgetFontWeight;
}

/**
 * A serializable snapshot of MetaMask's design tokens, shaped for direct use
 * with `@expo/ui/swift-ui` components/modifiers (`foregroundStyle(theme.colors.x)`,
 * `font({ size: theme.typography.bodyMd.size, weight: theme.typography.bodyMd.weight })`).
 *
 * Only solid (non-alpha) color tokens are included. `@expo/ui` parses 8-digit
 * hex as `#AARRGGBB` (alpha first), while `@metamask/design-tokens` emits
 * alpha-suffixed tokens as `#RRGGBBAA` (alpha last) — mixing the two silently
 * produces the wrong color, so alpha tokens (e.g. `border.muted`,
 * `background.muted`) are deliberately left out. Use `colors.border` (mapped
 * from the solid `border.default` token) instead.
 */
export interface WidgetTheme {
  colorScheme: WidgetColorScheme;
  colors: {
    background: string;
    surface: string;
    textDefault: string;
    textAlternative: string;
    textMuted: string;
    primary: string;
    success: string;
    error: string;
    border: string;
    icon: string;
  };
  typography: {
    amountDisplay: WidgetTypographyStyle;
    headingMd: WidgetTypographyStyle;
    bodyMd: WidgetTypographyStyle;
    bodySm: WidgetTypographyStyle;
    bodyXs: WidgetTypographyStyle;
  };
  /** A 4px-based spacing scale, in points, matching the app's spacing tokens. */
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
}

/**
 * Props every MetaMask widget/Live Activity layout receives, in addition to
 * its own feature-specific data.
 *
 * Both the light AND dark theme are always provided — never just "the
 * current" theme — because the widget sandbox has no way to react to OS
 * appearance changes other than the `colorScheme` it receives fresh on every
 * render via its `environment` parameter (WidgetKit re-invokes the layout
 * whenever the home/lock screen's light/dark mode changes, independent of
 * whether the app pushed a new update). Pick the right one *inside* the
 * layout function itself:
 *
 * ```tsx
 * function MyWidgetLayout(props: MyProps & WithWidgetTheme, environment: WidgetEnvironment) {
 *   'widget';
 *   const theme = environment.colorScheme === 'dark' ? props.theme.dark : props.theme.light;
 *   // ...
 * }
 * ```
 *
 * Do NOT try to resolve "the current theme" outside the layout function and
 * pass only one variant — that would only update on the next
 * `WidgetUpdaterService` push (e.g. next app foreground), not instantly when
 * the OS appearance changes. See docs/widgets/README.md#theming.
 *
 * Note widgets always follow the *system* appearance, never MetaMask's
 * in-app theme override (Settings > General > Theme) — `WidgetEnvironment.colorScheme`
 * is supplied by WidgetKit/the OS, with no visibility into the host app's own
 * Redux state. This matches how every other iOS widget behaves.
 */
export interface WithWidgetTheme {
  theme: {
    light: WidgetTheme;
    dark: WidgetTheme;
  };
}
