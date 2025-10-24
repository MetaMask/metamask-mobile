import { typography } from '@metamask/design-tokens';
import { FontWeight, FontStyle, TextVariant } from './Text.types';
import { GEIST_WEIGHT_MAPPING } from '../../../../constants/fonts';

export const getFontFamily = (
  variant: TextVariant,
  fontWeight?: FontWeight,
  fontStyle?: FontStyle,
): string => {
  const resolvedWeight = fontWeight ?? typography[variant].fontWeight;
  const resolvedStyle = fontStyle ?? 'normal';

  const fontSuffix =
    GEIST_WEIGHT_MAPPING[resolvedWeight as keyof typeof GEIST_WEIGHT_MAPPING];
  const italicSuffix = resolvedStyle === 'italic' ? '-Italic' : '';

  // Return PostScript name format (with hyphens)
  return `Geist-${fontSuffix}${italicSuffix}`;
};
