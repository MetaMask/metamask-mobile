// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { JazziconStyleSheetVars } from './Jazzicon.types';

/**
 * Style sheet function for Jazzicon component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: JazziconStyleSheetVars }) => {
  const { vars } = params;
  const { style, size } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        overflow: 'hidden',
        width: size,
        height: size,
        borderRadius: size / 2,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
