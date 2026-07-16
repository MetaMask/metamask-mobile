import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; providerBg?: string }) =>
  StyleSheet.create({
    headerWithoutPadding: {
      paddingVertical: 0,
    },
    webview: {
      // Matches the provider iframe background to suppress the native white
      // flash before content loads. Falls back to undefined (transparent) for
      // unknown providers.
      backgroundColor: params.providerBg,
    },
  });

export default styleSheet;
