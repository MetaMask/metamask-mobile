// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { ButtonIconStyleSheetVars } from './ButtonIcon.types';

/**
 * Style sheet function for ButtonIcon component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonIconStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { style, size, pressed } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        alignItems: 'center',
        justifyContent: 'center',
        height: Number(size),
        width: Number(size),
        borderRadius: 8,
        ...(pressed && {
          backgroundColor: theme.colors.background.defaultPressed,
        }),
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
