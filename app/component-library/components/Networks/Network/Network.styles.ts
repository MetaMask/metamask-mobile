// Third party dependencies.
import { ImageStyle, StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { NetworkStyleSheetVars } from './Network.types';

/**
 * Style sheet function for Badge component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: NetworkStyleSheetVars }) => {
  const { vars, theme } = params;
  const { style, size } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: theme.colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    image: Object.assign({
      width: Number(size),
      height: Number(size),
      borderRadius: Number(size) / 2,
    } as ImageStyle),
  });
};

export default styleSheet;
