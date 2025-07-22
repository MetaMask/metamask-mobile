import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { screenHeight: number } }) =>
  StyleSheet.create({
    headerWithoutPadding: {
      paddingVertical: 0,
    },
    webview: {
      backgroundColor: params.theme.colors.background.default,
    },
  });

export default styleSheet;
