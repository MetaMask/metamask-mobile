import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    webview: {
      backgroundColor: params.theme.colors.background.default,
    },
  });

export default styleSheet;
