export type FontWeight =
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | 'normal'
  | 'bold';
type FontStyle = 'normal' | 'italic';

export const getFontStyleVariant = (
  fontWeight: FontWeight = '400',
  fontStyle: FontStyle = 'normal',
): string => {
  const weightMap: { [key in FontWeight]: string } = {
    '100': 'Book',
    '200': 'Book',
    '300': 'Book',
    '400': 'Book',
    '500': 'Medium',
    '600': 'Medium',
    '700': 'Bold',
    '800': 'Bold',
    '900': 'Bold',
    normal: 'Book',
    bold: 'Bold',
  };

  const styleSuffix = fontStyle === 'italic' ? 'Italic' : '';

  const fontSuffix = weightMap[fontWeight];

  return `CentraNo1-${fontSuffix}${styleSuffix}`;
};
