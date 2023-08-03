// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for BottomSheet component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = () => {
  return StyleSheet.create({
    base: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
    },
  });
};

export default styleSheet;
