import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      margin: 24,
      maxWidth: 400,
      width: '100%',
    },
    content: {
      padding: 24,
    },
    title: {
      textAlign: 'center',
      marginBottom: 16,
    },
    description: {
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    declineButton: {
      flex: 1,
    },
    consentButton: {
      flex: 1,
    },
  }); 