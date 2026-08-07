import { typography } from '@metamask/design-tokens';
import { FontWeight, FontStyle, TextVariant } from './Text.types';

export const getFontFamily = (
  variant: TextVariant,
  fontWeight?: FontWeight,
  _fontStyle?: FontStyle,
): string => {
  const resolvedWeight = fontWeight ?? typography[variant].fontWeight;

  const weightToFontSuffix: Record<
    FontWeight,
    'Regular' | 'Medium' | 'SemiBold'
  > = {
    '100': 'Regular',
    '200': 'Regular',
    '300': 'Regular',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'SemiBold',
    '800': 'SemiBold',
    '900': 'SemiBold',
    normal: 'Regular',
    bold: 'SemiBold',
  };

  const fontSuffix = weightToFontSuffix[resolvedWeight as FontWeight];

  // Oswald does not ship italic cuts in this app; ignore italic style.
  return `Oswald-${fontSuffix}`;
};
