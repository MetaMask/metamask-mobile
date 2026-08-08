// Third party dependencies.
import { StyleSheet, TextStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { FontStyle, FontWeight, TextColor, TextVariant } from './Text.types';
import { getFontFamily } from './Text.utils';

/**
 * Style sheet function for Text component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { theme, vars } = params;
  const { variant, style, color } = vars;

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
      textColor = color;
  }
  const { fontWeight: _variantFontWeight, ...variantObject } =
    theme.typography[variant as TextVariant];

  // Custom RN fonts are per-file families (Urbanist-Regular/Medium/SemiBold).
  // Applying fontWeight alongside those names makes iOS fall back to the system font.
  const {
    fontWeight: styleFontWeight,
    fontStyle: styleFontStyle,
    ...styleWithoutWeight
  } = (style ?? {}) as TextStyle;

  const fontObject: TextStyle = {
    ...variantObject,
    color: textColor,
    fontFamily: getFontFamily(
      variant,
      styleFontWeight != null
        ? (String(styleFontWeight) as FontWeight)
        : undefined,
      styleFontStyle as FontStyle | undefined,
    ),
    ...styleWithoutWeight,
  };

  return StyleSheet.create({
    base: fontObject,
  });
};

export default styleSheet;
