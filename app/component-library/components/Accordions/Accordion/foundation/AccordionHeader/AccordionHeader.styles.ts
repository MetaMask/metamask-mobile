// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { AccordionHeaderStyleSheetVars } from './AccordionHeader.types';

/**
 * Style sheet function for AccordionHeader component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AccordionHeaderStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        height: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    title: {
      color: colors.primary.default,
    },
    arrowContainer: {
      marginLeft: 4,
    },
  });
};

export default styleSheet;
