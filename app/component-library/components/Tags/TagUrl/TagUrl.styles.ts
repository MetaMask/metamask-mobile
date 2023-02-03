// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { TagUrlStyleSheetVars } from './TagUrl.types';

/**
 * Style sheet function for TagUrl component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: TagUrlStyleSheetVars }) => {
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
        alignSelf: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    favicon: {
      marginRight: 8,
    },
    label: {
      color: colors.text.alternative,
      flexShrink: 1,
    },
    cta: {
      marginLeft: 16,
    },
    icon: {
      color: colors.icon.alternative,
      marginRight: 4,
    },
  });
};

export default styleSheet;
