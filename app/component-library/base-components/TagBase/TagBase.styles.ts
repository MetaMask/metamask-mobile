// Third party dependencies
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies
import { Theme } from '../../../util/theme/models';

// Internal dependencies
import { TagShape, TagSeverity } from './TagBase.types';

/**
 * Style sheet function for Jazzicon component.
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
  const { style, shape, containerSize, severity, includesBorder } = vars;

  let backgroundColor, textColor, borderColor;
  switch (severity) {
    case TagSeverity.Neutral:
      backgroundColor = theme.colors.background.alternative;
      textColor = theme.colors.text.alternative;
      borderColor = theme.colors.border.default;
      break;
    case TagSeverity.Success:
      backgroundColor = theme.colors.success.muted;
      textColor = theme.colors.success.default;
      borderColor = theme.colors.success.default;
      break;
    case TagSeverity.Info:
      backgroundColor = theme.colors.info.muted;
      textColor = theme.colors.info.default;
      borderColor = theme.colors.info.default;
      break;
    case TagSeverity.Danger:
      backgroundColor = theme.colors.error.muted;
      textColor = theme.colors.error.default;
      borderColor = theme.colors.error.default;
      break;
    case TagSeverity.Warning:
      backgroundColor = theme.colors.warning.muted;
      textColor = theme.colors.warning.default;
      borderColor = theme.colors.warning.default;
      break;
    case TagSeverity.Default:
    default:
      backgroundColor = theme.colors.background.default;
      textColor = theme.colors.text.default;
      borderColor = theme.colors.border.default;
      break;
  }

  let borderRadius = 4;
  if (shape === TagShape.Pill) {
    borderRadius = containerSize ? containerSize.height / 2 : 999;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        alignSelf: 'flex-start',
        borderRadius,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor,
        color: textColor,
        borderColor,
        borderWidth: includesBorder ? 1 : 0,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    text: {
      color: textColor,
    },
  });
};

export default styleSheet;
