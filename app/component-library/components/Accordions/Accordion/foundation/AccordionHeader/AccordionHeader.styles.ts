// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import {
  AccordionHeaderStyleSheetVars,
  AccordionHeaderHorizontalAlignment,
} from './AccordionHeader.types';

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
  const { style, horizontalAlignment } = vars;
  let justifyContent;
  switch (horizontalAlignment) {
    case AccordionHeaderHorizontalAlignment.Start:
      justifyContent = 'flex-start';
      break;
    case AccordionHeaderHorizontalAlignment.End:
      justifyContent = 'flex-end';
      break;
    case AccordionHeaderHorizontalAlignment.Center:
    default:
      justifyContent = 'center';
      break;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        height: 24,
        flexDirection: 'row',
        justifyContent,
        alignItems: 'center',
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
