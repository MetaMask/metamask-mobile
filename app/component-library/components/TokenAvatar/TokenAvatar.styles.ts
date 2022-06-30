import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from 'app/util/theme/models';
import { BaseAvatarSize } from '../BaseAvatar';
import { TokenAvatarStyleSheetVars } from './TokenAvatar.types';

/**
 * Style sheet function for TokenAvatar component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars TokenAvatar stylesheet vars.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: TokenAvatarStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { size, style } = vars;
  const baseStyle = {
    backgroundColor: theme.colors.background.alternative,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  };
  return StyleSheet.create({
    base: Object.assign(baseStyle, style) as ViewStyle,
    label: size === BaseAvatarSize.Xs ? { lineHeight: 16 } : {},
    image: {
      flex: 1,
    },
  });
};

export default styleSheet;
