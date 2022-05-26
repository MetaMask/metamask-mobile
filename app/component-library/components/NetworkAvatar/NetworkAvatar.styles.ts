import { StyleSheet } from 'react-native';
import { Theme } from 'app/util/theme/models';

/**
 * Style sheet function for NetworkAvatar component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    imageStyle: {
      flex: 1,
    },
    networkPlaceholderContainer: {
      flex: 1,
      backgroundColor: theme.colors.background.alternative,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
