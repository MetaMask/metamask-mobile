import { Platform, type TextStyle } from 'react-native';
import { FontFamily, TextVariant } from '@metamask/design-system-react-native';

/**
 * App languages whose glyphs fit in Grotzec Cond Bold.
 * Vietnamese is Latin but its tone marks are not in the font.
 */
const GROTZEC_LANGUAGE_CODES = new Set([
  'de',
  'en',
  'es',
  'fr',
  'id',
  'pt',
  'tl',
  'tr',
]);

interface HeroTitleMetrics {
  /** 80% line height, -2% tracking, and 20% padding with a matching negative margin. */
  iosClassName: string;
  /** 110% line height and -2% tracking. Android clips a line box shorter than the font. */
  androidClassName: string;
  /**
   * Smaller variant used when Grotzec cannot draw the language. Headings keep
   * their size, so this is set only for the Display sizes.
   */
  unsupportedVariant?: TextVariant;
}

/**
 * Pixel classes for each Display and Heading size. `Text` applies the variant
 * first, so these classes replace only line height, tracking, padding, and margin.
 */
const HERO_TITLE_VARIANTS: Partial<Record<TextVariant, HeroTitleMetrics>> = {
  [TextVariant.DisplayXl]: {
    iosClassName: 'py-3 leading-[48px] tracking-[-1.2px] -mb-[12px]',
    androidClassName: 'leading-[66px] tracking-[-1.2px]',
    unsupportedVariant: TextVariant.DisplayLg,
  },
  [TextVariant.DisplayLg]: {
    iosClassName: 'py-2 leading-[32px] tracking-[-0.8px] -mb-[8px]',
    androidClassName: 'leading-[44px] tracking-[-0.8px]',
    unsupportedVariant: TextVariant.DisplayMd,
  },
  [TextVariant.DisplayMd]: {
    iosClassName: 'py-[6.4px] leading-[25.6px] tracking-[-0.64px] -mb-[6.4px]',
    androidClassName: 'leading-[35.2px] tracking-[-0.64px]',
    unsupportedVariant: TextVariant.HeadingLg,
  },
  [TextVariant.HeadingLg]: {
    iosClassName: 'py-[4.8px] leading-[19.2px] tracking-[-0.48px] -mb-[4.8px]',
    androidClassName: 'leading-[26.4px] tracking-[-0.48px]',
  },
  [TextVariant.HeadingMd]: {
    iosClassName: 'py-1 leading-[16px] tracking-[-0.4px] -mb-[4px]',
    androidClassName: 'leading-[22px] tracking-[-0.4px]',
  },
  [TextVariant.HeadingSm]: {
    iosClassName: 'py-[3.2px] leading-[12.8px] tracking-[-0.32px] -mb-[3.2px]',
    androidClassName: 'leading-[17.6px] tracking-[-0.32px]',
  },
};

export interface MarketingMomentTitlePresentation {
  variant: TextVariant;
  fontFamily?: FontFamily;
  /**
   * System face for languages Grotzec cannot draw. Grotzec titles leave this
   * unset and use `className` instead.
   */
  style?: TextStyle;
  /**
   * Grotzec leading, tracking, and clip classes for the requested variant.
   */
  className?: string;
}

const systemFontStyle = (os: typeof Platform.OS): TextStyle => ({
  fontFamily: os === 'ios' ? 'System' : 'Roboto',
  fontWeight: '700',
});

/**
 * Whether the app language can use Grotzec. `en-US` and `pt_BR` match on the
 * language subtag.
 *
 * @param locale - Active `I18n.locale` value.
 * @returns True when the language is covered by Grotzec Cond Bold.
 */
export function supportsGrotzecLocale(
  locale: string | undefined | null,
): boolean {
  const language = (locale ?? '').toLowerCase().split(/[-_]/)[0];
  return GROTZEC_LANGUAGE_CODES.has(language);
}

/**
 * Display metrics for a hero title. Grotzec locales keep the requested variant
 * and add that size's tight classes. Other locales use the system face and the
 * variant's own line height, stepping Display sizes down one level.
 *
 * @param supportsGrotzec - Result of {@link supportsGrotzecLocale}.
 * @param os - Platform used to choose the line box and fallback face.
 * @param variant - Requested Display or Heading size. Defaults to DisplayXl.
 * @returns Variant, optional hero family, classes, and system-font style.
 */
export function getMarketingMomentTitlePresentation(
  supportsGrotzec: boolean,
  os: typeof Platform.OS = Platform.OS,
  variant: TextVariant = TextVariant.DisplayXl,
): MarketingMomentTitlePresentation {
  const metrics = HERO_TITLE_VARIANTS[variant];

  if (!supportsGrotzec) {
    return {
      variant: metrics?.unsupportedVariant ?? variant,
      style: systemFontStyle(os),
    };
  }

  return {
    variant,
    fontFamily: FontFamily.Hero,
    className: os === 'ios' ? metrics?.iosClassName : metrics?.androidClassName,
  };
}
