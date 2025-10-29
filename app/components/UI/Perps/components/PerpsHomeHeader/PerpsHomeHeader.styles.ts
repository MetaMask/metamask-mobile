import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

/**
 * Styles for PerpsHomeHeader component
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background.default,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'left',
      marginLeft: 4,
      marginRight: 12,
    },
    searchButton: {
      padding: 4,
    },
    searchBarContainer: {
      flex: 1,
      marginRight: 8,
    },
  });
};

export default styleSheet;
