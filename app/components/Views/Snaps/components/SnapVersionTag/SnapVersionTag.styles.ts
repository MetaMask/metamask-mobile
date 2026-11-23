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
    versionBadgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.alternative,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 16,
    },
    versionBadgeItem: {
      padding: 2,
    },
  });
};

export default styleSheet;
