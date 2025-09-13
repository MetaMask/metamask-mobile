import { StyleSheet } from 'react-native';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay.default,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      padding: 24,
      margin: 16,
      maxWidth: 400,
      width: '100%',
    },
    content: {
      alignItems: 'center',
    },
    title: {
      marginBottom: 16,
      textAlign: 'center',
    },
    description: {
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      gap: 12,
    },
    declineButton: {
      flex: 1,
    },
    consentButton: {
      flex: 1,
    },
  });

export { createStyles };
