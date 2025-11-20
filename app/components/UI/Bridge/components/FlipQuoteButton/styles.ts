import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

interface StyleVars {
  pressed: boolean;
  disabled: boolean;
}

export const createStyles = (params: { theme: Theme; vars: StyleVars }) => {
  const { theme, vars } = params;
  return StyleSheet.create({
    arrowContainer: {
      display: 'flex',
      justifyContent: 'center',
      position: 'relative',
      alignItems: 'center',
      flexDirection: 'row',
    },
    separator: {
      backgroundColor: theme.colors.border.muted,
      position: 'absolute',
      width: '100%',
      height: 1,
    },
    arrowCircle: {
      position: 'relative',
      backgroundColor: theme.colors.background.default,
    },
    arrow: {
      fontSize: 20,
      color: theme.colors.text.default,
      lineHeight: 20,
      height: 20,
      includeFontPadding: false,
      textAlignVertical: 'center',
      paddingTop: 1,
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      borderRadius: 10000,
      opacity: vars.disabled ? 0.5 : 1,
      backgroundColor: theme.colors.background.muted,
      ...(vars.pressed && {
        backgroundColor: theme.colors.background.mutedPressed,
      }),
    },
  });
};
