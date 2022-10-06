// Third party dependencies.
import { StyleSheet, TextStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

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
  const { style } = vars;
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    text: Object.assign(
      {
        color: theme.colors.text.default,
      },
      style,
    ) as TextStyle,
  });
};

export default styleSheet;
