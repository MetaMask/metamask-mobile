import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';
import { getElevatedSurfaceColor } from '../../../../../../util/theme/themeUtils';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    headerWithoutPadding: {
      paddingVertical: 0,
    },
    webview: {
      backgroundColor: getElevatedSurfaceColor(params.theme),
    },
  });

export default styleSheet;
