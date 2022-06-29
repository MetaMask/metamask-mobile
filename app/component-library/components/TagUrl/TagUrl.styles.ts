import { StyleSheet, ViewStyle } from 'react-native';
import { TagUrlStyleSheet, TagUrlStyleSheetVars } from './TagUrl.types';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for TagUrl component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: TagUrlStyleSheetVars;
}): TagUrlStyleSheet => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: colors.background.default,
        borderColor: colors.border.default,
        borderWidth: 1,
        borderRadius: 99,
        paddingVertical: 8,
        paddingLeft: 8,
        paddingRight: 16,
        flexDirection: 'row',
        alignItems: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    label: {
      marginLeft: 8,
      color: colors.text.alternative,
    },
    cta: {
      marginLeft: 16,
    },
  });
};

export default styleSheet;
