// Third party dependencies.
import { StyleSheet, ImageStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { BlockiesStyleSheetVars } from './Blockies.types';

/**
 * Style sheet function for Blockies component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: BlockiesStyleSheetVars }) => {
  const { vars } = params;
  const { style, size } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        width: size,
        height: size,
      } as ImageStyle,
      style,
    ) as ImageStyle,
  });
};

export default styleSheet;
