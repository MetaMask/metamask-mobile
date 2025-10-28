import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    keyboardAvoidingView: {
      flex: 1,
    },
    safeAreaView: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
      paddingHorizontal: 16,
    },
    containerSpaceAround: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
      justifyContent: 'space-around',
      paddingHorizontal: 16,
    },
    title: {
      marginTop: 24,
      textAlign: 'center',
    },
    locationButtonText: {
      marginTop: 4,
      textAlign: 'center',
    },
    textFieldsContainer: {
      marginTop: 24,
      gap: 16,
    },
    label: {
      marginBottom: 6,
    },
    usFlag: {
      fontSize: 20,
      textAlign: 'center',
    },
    locationButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
    },
    locationButton: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.colors.background.default,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      width: '48%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationButtonSelected: {
      borderColor: theme.colors.primary.default,
    },
    wrapper: {
      alignItems: 'center',
    },
    imageWrapper: {
      alignItems: 'center',
      marginTop: 28,
    },
    image: {
      transform: [{ rotate: '1.9deg' }],
      height: 80,
    },
    buttonsContainer: {
      marginTop: 28,
      marginBottom: 32,
      gap: 8,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    scrollViewContentContainer: {
      flexGrow: 1,
    },
    errorBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.error.muted,
    },
  });

export default createStyles;
