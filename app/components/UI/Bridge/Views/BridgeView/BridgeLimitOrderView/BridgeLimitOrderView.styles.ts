import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

export const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
    },
    inputsContainer: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    inputCardsWrapper: {
      position: 'relative',
    },
    tokenCard: {
      backgroundColor: theme.colors.background.section,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 24,
    },
  });
};
