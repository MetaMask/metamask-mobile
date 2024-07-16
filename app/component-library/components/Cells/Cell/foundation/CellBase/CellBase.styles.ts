// Third library dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { CellBaseStyleSheetVars } from './CellBase.types';

// Internal dependencies.
import { Theme } from '../../../../../../util/theme/models';

/**
 * Style sheet function for CellBase component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: CellBaseStyleSheetVars }) => {
  const { vars } = params;
  const { style } = vars;

  return StyleSheet.create({
    cellBase: Object.assign({ padding: 0 } as ViewStyle, style) as ViewStyle,
    tagLabel: {
      alignSelf: 'flex-start',
      marginTop: 4,
    },
  });
};

export default styleSheet;
