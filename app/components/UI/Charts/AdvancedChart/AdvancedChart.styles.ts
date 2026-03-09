import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../util/theme/models';

export const DEFAULT_CHART_HEIGHT = 900;

const styleSheet = (params: { theme: Theme; vars: { height: number } }) =>
  StyleSheet.create({
    container: {
      width: '100%',
      height: params.vars.height,
      backgroundColor: params.theme.colors.background.default,
    },
    webview: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: params.theme.colors.background.default,
    },
    loadingText: {
      marginTop: 12,
      color: params.theme.colors.text.muted,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: params.theme.colors.background.default,
    },
    errorText: {
      color: params.theme.colors.error.default,
      textAlign: 'center',
    },
  });

export default styleSheet;
