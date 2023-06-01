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
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    snapInfoContainer: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    snapCell: {
      borderRadius: 8,
      borderWidth: 0,
    },
    detailsContainerWithBorder: {
      padding: 16,
      borderColor: colors.border.default,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detailsContainer: {
      padding: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });
};

export default styleSheet;
