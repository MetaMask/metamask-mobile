// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// Internal dependencies.
import { ButtonIconStyleSheetVars } from './ButtonIcon.types';

/**
 * Style sheet function for ButtonIcon component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { vars: ButtonIconStyleSheetVars }) => {
  const { vars } = params;
  const { style, size } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        alignItems: 'center',
        justifyContent: 'center',
        height: Number(size),
        width: Number(size),
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
