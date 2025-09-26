import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      backgroundColor: colors.background.default,
    },
    errorContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    errorIcon: {
      marginBottom: 16,
    },
    errorTitle: {
      marginBottom: 16,
      textAlign: 'center',
    },
    errorMessage: {
      textAlign: 'center',
      marginBottom: 24,
      paddingHorizontal: 16,
      lineHeight: 20,
    },
    debugMessage: {
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 16,
      fontSize: 12,
      fontStyle: 'italic',
      opacity: 0.7,
    },
    buttonContainer: {
      width: '100%',
      alignItems: 'center',
      gap: 12,
    },
    retryButton: {
      minWidth: 200,
    },
    backButton: {
      minWidth: 200,
    },
  });
};

export default styleSheet;
