// Third party dependencies.
import { StyleSheet, TextStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import { TextColor } from '../Text/Text.types';

// Internal dependencies.
import { TextWithPrefixIconStyleSheetVars } from './TextWithPrefixIcon.types';

/**
 * Style sheet function for TextWithPrefixIcon component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: TextWithPrefixIconStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, color } = vars;
  let iconColor;
  switch (color) {
    case TextColor.Default:
      iconColor = theme.colors.text.default;
      break;
    case TextColor.Inverse:
      iconColor = theme.colors.primary.inverse;
      break;
    case TextColor.Alternative:
      iconColor = theme.colors.text.alternative;
      break;
    case TextColor.Muted:
      iconColor = theme.colors.text.muted;
      break;
    case TextColor.Primary:
      iconColor = theme.colors.primary.default;
      break;
    case TextColor.PrimaryAlternative:
      iconColor = theme.colors.primary.alternative;
      break;
    case TextColor.Success:
      iconColor = theme.colors.success.default;
      break;
    case TextColor.Error:
      iconColor = theme.colors.error.default;
      break;
    case TextColor.ErrorAlternative:
      iconColor = theme.colors.error.alternative;
      break;
    case TextColor.Warning:
      iconColor = theme.colors.warning.default;
      break;
    case TextColor.Info:
      iconColor = theme.colors.info.default;
      break;
    default:
      iconColor = theme.colors.text.default;
  }

  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: Object.assign(
      {
        color: iconColor,
      },
      style,
    ) as TextStyle,
  });
};

export default styleSheet;
