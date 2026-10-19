import { Platform, type TextStyle } from 'react-native';
import { FontFamily, TextVariant } from '@metamask/design-system-react-native';
import { typography } from '@metamask/design-tokens';

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

const DISPLAY_XL_FONT_SIZE = typography.sDisplayXL.fontSize;
const GROTZEC_LINE_HEIGHT_RATIO = 0.8;
const GROTZEC_ANDROID_LINE_HEIGHT_RATIO = 1.1;
const GROTZEC_TRACKING_RATIO = -0.02;

export interface MarketingMomentTitlePresentation {
  variant: TextVariant;
  fontFamily?: FontFamily;
  style: TextStyle;
  /**
   * Extra layout classes. iOS Grotzec titles use `py-3` so the tight line box
   * does not clip the face.
   */
  className?: string;
}

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
 * Display metrics for a marketing title. Grotzec locales use DisplayXl with
 * the agency leading and tracking. Other locales use the system face at
 * DisplayLg so the title does not grow without the condensed metrics.
 *
 * iOS can draw an 80% line box by padding the text and pulling the next line
 * back up. Android clips to the line box, so supported titles stay at 1.1.
 *
 * @param supportsGrotzec - Result of {@link supportsGrotzecLocale}.
 * @param os - Platform used to choose the line box and fallback face.
 * @returns Variant, optional hero family, and style overrides.
 */
export function getMarketingMomentTitlePresentation(
  supportsGrotzec: boolean,
  os: typeof Platform.OS = Platform.OS,
): MarketingMomentTitlePresentation {
  if (!supportsGrotzec) {
    return {
      variant: TextVariant.DisplayLg,
      style: {
        fontFamily: os === 'ios' ? 'System' : 'Roboto',
        fontWeight: '700',
      },
    };
  }

  const letterSpacing = DISPLAY_XL_FONT_SIZE * GROTZEC_TRACKING_RATIO;

  if (os === 'ios') {
    const lineHeight = DISPLAY_XL_FONT_SIZE * GROTZEC_LINE_HEIGHT_RATIO;
    const clipPadding = (DISPLAY_XL_FONT_SIZE - lineHeight) / 2;

    return {
      variant: TextVariant.DisplayXl,
      fontFamily: FontFamily.Hero,
      className: 'py-3',
      style: {
        lineHeight,
        letterSpacing,
        marginBottom: -clipPadding,
      },
    };
  }

  return {
    variant: TextVariant.DisplayXl,
    fontFamily: FontFamily.Hero,
    style: {
      lineHeight: DISPLAY_XL_FONT_SIZE * GROTZEC_ANDROID_LINE_HEIGHT_RATIO,
      letterSpacing,
    },
  };
}
