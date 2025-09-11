import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      overflow: 'hidden',
      position: 'relative',
    },
    webView: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.default,
      zIndex: 10,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.error.muted,
      padding: 16,
    },
  });
};
