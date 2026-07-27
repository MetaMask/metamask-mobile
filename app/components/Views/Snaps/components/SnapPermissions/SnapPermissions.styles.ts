///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;
  return StyleSheet.create({
    section: {
      paddingVertical: 16,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    divider: {
      backgroundColor: colors.border.muted,
      height: 1,
    },
  });
};
export default styleSheet;
///: END:ONLY_INCLUDE_IF
