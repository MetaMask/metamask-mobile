// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for AvatarGroup component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { theme, vars } = params;
  const { stackWidth } = vars;

  const borderWidth = 1;

  return StyleSheet.create({
    base: { flexDirection: 'row' },
    stack: {
      flexDirection: 'row',
      alignItems: 'center',
      width: stackWidth + borderWidth * 2,
    },
    stackedAvatarWrapper: {
      position: 'absolute',
      borderRadius: 50,
      borderWidth,
      borderColor: theme.colors.background.default,
    },
    overflowCounterWrapper: {
      justifyContent: 'center',
    },
    textStyle: {
      color: theme.colors.text.alternative,
      marginLeft: 2,
    },
  });
};

export default styleSheet;
