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
      height: 40,
      marginVertical: -16,
      zIndex: 1,
      elevation: 1,
    },
    arrowCircle: {
      position: 'relative',
      zIndex: 1,
      elevation: 1,
    },
    cutoutWing: {
      position: 'absolute',
      top: 1.5,
    },
    leftCutoutWing: {
      right: '50%',
      marginRight: 10,
    },
    rightCutoutWing: {
      left: '50%',
      marginLeft: 10,
      transform: [{ scaleX: -1 }],
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 6,
      borderColor: theme.colors.background.default,
      opacity: vars.disabled ? 0.5 : 1,
      backgroundColor: theme.colors.background.section,
      ...(vars.pressed && {
        backgroundColor: theme.colors.background.alternativePressed,
      }),
    },
  });
};
