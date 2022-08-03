import { StyleSheet, ViewStyle } from 'react-native';

import { AvatarBaseSize } from '../AvatarBase';
import { Theme } from '../../../../util/theme/models';

import { AvatarNetworkStyleSheetVars } from './AvatarNetwork.types';

/**
 * Style sheet function for AvatarNetwork component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars AvatarNetwork stylesheet vars.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarNetworkStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { size, style, showPlaceholder } = vars;
  const baseStyle: ViewStyle = showPlaceholder
    ? {
        backgroundColor: theme.colors.background.alternative,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
      }
    : {};
  return StyleSheet.create({
    base: Object.assign(baseStyle, style) as ViewStyle,
    label: size === AvatarBaseSize.Xs ? { lineHeight: 16 } : {},
    image: {
      flex: 1,
    },
  });
};

export default styleSheet;
