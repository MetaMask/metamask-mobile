import { StyleSheet } from 'react-native';
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
  const { size } = vars;
  return StyleSheet.create({
    baseText: size === BaseAvatarSize.Xs ? { lineHeight: 16 } : {},
    imageStyle: {
      flex: 1,
      width: 'auto',
    },
    networkPlaceholderContainer: {
      flex: 1,
      backgroundColor: theme.colors.background.alternative,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 50,
      borderColor: theme.colors.border.muted,
    },
  });
};

export default styleSheet;
