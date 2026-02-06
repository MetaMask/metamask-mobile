import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    tokensList: {
      flex: 1,
    },
    tokensListContainer: {
      paddingBottom: 16,
      flexGrow: 1,
    },
    buttonContainer: {
      paddingHorizontal: 8,
    },
    searchInput: {
      marginVertical: 12,
      borderRadius: 12,
      borderWidth: 0,
      backgroundColor: theme.colors.background.section,
    },
    tokenItem: {
      paddingVertical: 8,
    },
    emptyStateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: 32,
      paddingTop: 100,
    },
  });
};
