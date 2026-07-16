import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; providerBg?: string }) =>
  StyleSheet.create({
    headerWithoutPadding: {
      paddingVertical: 0,
    },
    webview: {
      // providerBg matches the provider iframe — prevents a flash before content loads.
      // Falls back to undefined (transparent) if the provider color is unknown.
      backgroundColor: params.providerBg,
    },
  });

export default styleSheet;
