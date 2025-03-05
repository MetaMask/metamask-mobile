import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '@metamask/design-tokens';

/**
 * Style sheet function for ControllersGate component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    background: {
      backgroundColor: theme.colors.background.default,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};

export default styleSheet;
