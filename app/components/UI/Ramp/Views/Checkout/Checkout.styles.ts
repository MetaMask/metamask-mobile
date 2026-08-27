import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { providerBg: string } }) =>
  StyleSheet.create({
    headerWithoutPadding: {
      paddingVertical: 0,
    },
    webview: {
      // Matches the provider iframe background to suppress the native white
      // flash before content loads. Unknown providers receive the BottomSheet
      // default surface color from getProviderWebviewColors.
      backgroundColor: params.vars.providerBg,
    },
  });

export default styleSheet;
