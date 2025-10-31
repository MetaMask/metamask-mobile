import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    tokensList: {
      marginTop: 10,
    },
    tokensListContainer: {
      flex: 1,
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
  });
};
