// Third party dependencies.
import { StyleSheet, TextStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { TextColor, TextVariant } from './Text.types';

type FontWeight =
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

/**
 * Style sheet function for Text component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { theme, vars } = params;
  const { variant, style, color } = vars;

  // Create a utility function to map fontWeight to the corresponding font family
  const getFontFamily = (
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

  let textColor;
  switch (color) {
    case TextColor.Default:
      textColor = theme.colors.text.default;
      break;
    case TextColor.Inverse:
      textColor = theme.colors.primary.inverse;
      break;
    case TextColor.Alternative:
      textColor = theme.colors.text.alternative;
      break;
    case TextColor.Muted:
      textColor = theme.colors.text.muted;
      break;
    case TextColor.Primary:
      textColor = theme.colors.primary.default;
      break;
    case TextColor.PrimaryAlternative:
      textColor = theme.colors.primary.alternative;
      break;
    case TextColor.Success:
      textColor = theme.colors.success.default;
      break;
    case TextColor.Error:
      textColor = theme.colors.error.default;
      break;
    case TextColor.ErrorAlternative:
      textColor = theme.colors.error.alternative;
      break;
    case TextColor.Warning:
      textColor = theme.colors.warning.default;
      break;
    case TextColor.Info:
      textColor = theme.colors.info.default;
      break;
    default:
      textColor = theme.colors.text.default;
  }
  const variantObject = theme.typography[variant as TextVariant];
  const fontObject = {
    ...variantObject,
    color: textColor,
    fontFamily: getFontFamily(
      variantObject.fontWeight as FontWeight,
      style?.fontStyle,
    ),
  };

  return StyleSheet.create({
    base: Object.assign(fontObject, style) as TextStyle,
  });
};

export default styleSheet;
