import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for TabBarItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { theme, vars } = params;
  const { stackWidth } = vars;

  return StyleSheet.create({
    base: { flexDirection: 'row' },
    stack: {
      flexDirection: 'row',
      alignItems: 'center',
      width: stackWidth,
    },
    stackedAvatarWrapper: {
      position: 'absolute',
      borderRadius: 50,
      borderWidth: 1,
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
