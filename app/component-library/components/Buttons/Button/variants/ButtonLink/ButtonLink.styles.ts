// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { colors } from '../../../../../../styles/common';

// Internal dependencies.
import { ButtonLinkStyleSheetVars } from './ButtonLink.types';

/**
 * Style sheet function for ButtonLink component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { vars: ButtonLinkStyleSheetVars }) => {
  const { vars } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      { backgroundColor: colors.transparent },
      StyleSheet.flatten(style),
    ) as ViewStyle,
    pressedText: { textDecorationLine: 'underline' },
  });
};

export default styleSheet;
