// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { TagStyleSheetVars } from './Tag.types';

/**
 * Style sheet function for Tag component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: TagStyleSheetVars }) => {
  const { theme, vars } = params;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: theme.colors.background.section,
        borderRadius: 4,
        height: 24,
        paddingHorizontal: 8,
        justifyContent: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
