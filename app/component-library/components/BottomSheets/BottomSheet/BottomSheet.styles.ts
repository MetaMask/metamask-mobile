// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { BottomSheetStyleSheetVars } from './BottomSheet.types';

/**
 * Style sheet function for BottomSheet component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BottomSheetStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const {} = vars;
  return StyleSheet.create({
    base: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
    },
  });
};

export default styleSheet;
