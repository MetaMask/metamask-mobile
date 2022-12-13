// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// Internal dependencies.
import { ButtonTertiaryStyleSheetVars } from './ButtonTertiary.types';

/**
 * Style sheet function for ButtonTertiary component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { vars: ButtonTertiaryStyleSheetVars }) => {
  const { vars } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: 'transparent',
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
