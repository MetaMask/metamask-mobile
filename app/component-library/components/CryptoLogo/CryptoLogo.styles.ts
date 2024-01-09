// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { CryptoLogoStyleSheetVars } from './CryptoLogo.types';

/**
 * Style sheet function for CryptoLogo component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: CryptoLogoStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, size } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        height: size,
        width: size,
        overflow: 'hidden',
        backgroundColor: params.theme.colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    image: {
      flex: 1,
      height: undefined,
      width: undefined,
    },
  });
};

export default styleSheet;
