import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

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
      paddingHorizontal: 24,
    },
    buttonContainer: {
      width: '100%',
      paddingHorizontal: 16,
      gap: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.default,
    },
    button: {
      width: '100%',
    },
    quoteContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    destinationAccountSelectorContainer: {
      paddingBottom: 12,
    },
    dynamicContent: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    keypadContainerWithDestinationPicker: {
      justifyContent: 'flex-end',
      paddingBottom: 8,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
    },
    disclaimerText: {
      textAlign: 'center',
    },
    destTokenArea: {
      // marginTop: 16,
    },
  });
};
