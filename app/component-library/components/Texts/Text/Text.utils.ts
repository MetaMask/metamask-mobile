import { typography } from '@metamask/design-tokens';
import { FontWeight, FontStyle, TextVariant } from './Text.types';

export const getFontFamily = (
  variant: TextVariant,
  fontWeight?: FontWeight,
  fontStyle?: FontStyle,
): string => {
  const resolvedWeight = fontWeight ?? typography[variant].fontWeight;
  const resolvedStyle = fontStyle ?? 'normal';

  const weightToFontSuffix: Record<FontWeight, 'Regular' | 'Medium' | 'Bold'> =
    {
      '100': 'Regular',
      '200': 'Regular',
      '300': 'Regular',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'Medium',
      '700': 'Bold',
      '800': 'Bold',
      '900': 'Bold',
      normal: 'Regular',
      bold: 'Bold',
    };

  const fontSuffix = weightToFontSuffix[resolvedWeight as FontWeight];
  const italicSuffix = resolvedStyle === 'italic' ? 'Italic' : '';

  return `Geist-${fontSuffix}${italicSuffix}`;
};
