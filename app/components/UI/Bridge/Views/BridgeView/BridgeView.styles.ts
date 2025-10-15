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
      paddingBottom: 24,
      gap: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.default,
      paddingTop: 12,
    },
    button: {
      width: '100%',
    },
    arrowContainer: {
      position: 'relative',
      alignItems: 'center',
      height: 1,
      backgroundColor: theme.colors.border.muted,
    },
    arrowCircle: {
      position: 'absolute',
      top: -22,
      backgroundColor: theme.colors.background.alternative,
      width: 44,
      height: 44,
      borderRadius: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrow: {
      fontSize: 20,
      color: theme.colors.text.default,
      lineHeight: 20,
      height: 20,
      includeFontPadding: false,
      textAlignVertical: 'center',
      paddingTop: 1,
    },
    quoteContainer: {
      paddingHorizontal: 24,
    },
    keypadContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingBottom: 8,
    },
    keypad: {
      paddingHorizontal: 24,
    },
    destinationAccountSelectorContainer: {
      paddingBottom: 12,
    },
    dynamicContent: {
      flex: 1,
      paddingBottom: 12,
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
      marginTop: 16,
    },
  });
};
