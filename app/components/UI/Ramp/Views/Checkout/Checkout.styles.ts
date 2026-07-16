import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; providerBg?: string }) =>
  StyleSheet.create({
    headerWithoutPadding: {
      paddingVertical: 0,
    },
    webview: {
      // Matches the provider iframe background to suppress the native white
      // flash before content loads. Falls back to background.alternative
      // (the BottomSheet default) for unknown providers.
      backgroundColor:
        params.providerBg ?? params.theme.colors.background.alternative,
    },
  });

export default styleSheet;
