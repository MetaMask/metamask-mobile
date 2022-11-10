// Third party dependencies.
import { ImageStyle, StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { FaviconStyleSheetVars } from './Favicon.types';

/**
 * Style sheet function for Badge component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: FaviconStyleSheetVars }) => {
  const { vars } = params;
  const { style, size } = vars;

  return StyleSheet.create({
    base: Object.assign({} as ViewStyle, style) as ViewStyle,
    image: Object.assign({
      width: Number(size),
      height: Number(size),
      borderRadius: Number(size) / 2,
    } as ImageStyle),
  });
};

export default styleSheet;
