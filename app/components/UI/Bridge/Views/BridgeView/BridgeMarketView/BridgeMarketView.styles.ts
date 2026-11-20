import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

export const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      flex: 1,
    },
    screen: {
      flex: 1,
    },
    inputsContainer: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    inputCardsWrapper: {
      position: 'relative',
      overflow: 'visible',
      zIndex: 0,
    },
    tokenCard: {
      backgroundColor: theme.colors.background.section,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 24,
      zIndex: 0,
    },
    buttonContainer: {
      width: '100%',
      paddingHorizontal: 16,
      gap: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.default,
    },
    quoteContainer: {
      justifyContent: 'flex-start',
    },
    dynamicContent: {
      justifyContent: 'flex-start',
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
    },
    loadingContainer: {
      paddingTop: 8,
    },
    destTokenArea: {
      // marginTop: 16,
    },
  });
};
