import {
  darkTheme,
  lightTheme,
  type Theme as DesignSystemTheme,
} from '@metamask/design-tokens';

import type {
  WidgetColorScheme,
  WidgetFontWeight,
  WidgetTheme,
  WidgetTypographyStyle,
} from './types';

// `@metamask/design-tokens` encodes weights as CSS-style numeric strings
// ('400' | '500' | '600'). Map them back to the semantic names `@expo/ui`'s
// `font({ weight })` modifier expects. Falls back to 'regular' so a future
// design-tokens change degrades gracefully instead of throwing inside a
// widget's timeline provider.
const FONT_WEIGHT_BY_TOKEN_VALUE: Record<string, WidgetFontWeight> = {
  '400': 'regular',
  '500': 'medium',
  '600': 'bold',
};

function toWidgetTypographyStyle(style: {
  fontSize: number;
  fontWeight: string;
}): WidgetTypographyStyle {
  return {
    size: style.fontSize,
    weight: FONT_WEIGHT_BY_TOKEN_VALUE[style.fontWeight] ?? 'regular',
  };
}

/**
 * Builds a serializable {@link WidgetTheme} snapshot from a design-system
 * theme. Pure and side-effect free — safe to call from anywhere, including
 * inside `WidgetUpdaterService` on every Redux state change.
 */
export function buildWidgetTheme(
  colorScheme: WidgetColorScheme,
  designSystemTheme: DesignSystemTheme = colorScheme === 'dark'
    ? darkTheme
    : lightTheme,
): WidgetTheme {
  const { colors, typography } = designSystemTheme;

  return {
    colorScheme,
    colors: {
      background: colors.background.default,
      surface: colors.background.alternative,
      textDefault: colors.text.default,
      textAlternative: colors.text.alternative,
      textMuted: colors.text.muted,
      primary: colors.primary.default,
      success: colors.success.default,
      error: colors.error.default,
      // Intentionally `border.default`, not `border.muted` — see the
      // `WidgetTheme` doc comment in ./types.ts for why the alpha-suffixed
      // token is unsafe to hand to `@expo/ui`.
      border: colors.border.default,
      icon: colors.icon.default,
    },
    typography: {
      amountDisplay: toWidgetTypographyStyle(typography.sAmountDisplayLg),
      headingMd: toWidgetTypographyStyle(typography.sHeadingMD),
      bodyMd: toWidgetTypographyStyle(typography.sBodyMD),
      bodySm: toWidgetTypographyStyle(typography.sBodySM),
      bodyXs: toWidgetTypographyStyle(typography.sBodyXS),
    },
    // A 4px-based scale mirroring the app's spacing tokens. Widgets don't
    // consume `useTailwind()` (no Tailwind/NativeWind runtime in the JSC
    // sandbox), so this is intentionally a small, hardcoded subset rather
    // than a full spacing scale.
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
  };
}

/** Precomputed default themes, for the common case of not needing a custom base theme. */
export const lightWidgetTheme = buildWidgetTheme('light');
export const darkWidgetTheme = buildWidgetTheme('dark');

export function getWidgetTheme(colorScheme: WidgetColorScheme): WidgetTheme {
  return colorScheme === 'dark' ? darkWidgetTheme : lightWidgetTheme;
}
