// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { TagColoredStyleSheetVars, TagColor } from './TagColored.types';

/**
 * Style sheet function for TagColored component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: TagColoredStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { style, color } = vars;
  let backgroundColor, textColor;
  switch (color) {
    case TagColor.Default:
      backgroundColor = theme.colors.background.alternative;
      textColor = theme.colors.text.alternative;
      break;
    case TagColor.Success:
      backgroundColor = theme.colors.success.muted;
      textColor = theme.colors.success.default;
      break;
    case TagColor.Info:
      backgroundColor = theme.colors.primary.muted;
      textColor = theme.colors.primary.default;
      break;
    case TagColor.Danger:
      backgroundColor = theme.colors.error.muted;
      textColor = theme.colors.error.default;
      break;
    case TagColor.Warning:
      backgroundColor = theme.colors.warning.muted;
      textColor = theme.colors.warning.default;
      break;
    default:
      backgroundColor = theme.colors.background.alternative;
      textColor = theme.colors.text.alternative;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        height: 20,
        backgroundColor,
        borderRadius: 4,
        paddingHorizontal: 8,
        alignSelf: 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    text: {
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: textColor,
    },
  });
};

export default styleSheet;
