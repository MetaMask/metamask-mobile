export type FontWeight =
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';
type FontStyle = 'normal' | 'italic';

export const getFontFamily = (
  fontWeight: FontWeight = '400',
  fontStyle: FontStyle = 'normal',
): string => {
  const weightMap: { [key in FontWeight]: string } = {
    '100': 'Regular',
    '200': 'Regular',
    '300': 'Regular',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'Medium',
    '700': 'Bold',
    '800': 'Bold',
    '900': 'Bold',
  };

  const styleSuffix = fontStyle === 'italic' ? 'Italic' : '';

  const fontSuffix = weightMap[fontWeight];

  return `EuclidCircularB-${fontSuffix}${styleSuffix}`;
};
