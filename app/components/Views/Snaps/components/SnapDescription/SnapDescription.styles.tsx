///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

/**
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    snapInfoContainer: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    description: {
      lineHeight: 20,
    },
  });
};

export default styleSheet;
///: END:ONLY_INCLUDE_IF
