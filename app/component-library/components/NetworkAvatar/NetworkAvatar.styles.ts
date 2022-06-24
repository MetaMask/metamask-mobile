import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from 'app/util/theme/models';
import { BaseAvatarSize } from '../BaseAvatar';
import { NetworkAvatarStyleSheetVars } from './NetworkAvatar.types';

/**
 * Style sheet function for NetworkAvatar component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars NetworkAvatar stylesheet vars.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: NetworkAvatarStyleSheetVars;
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
    label: size === BaseAvatarSize.Xs ? { lineHeight: 16 } : {},
    image: {
      flex: 1,
    },
  });
};

export default styleSheet;
