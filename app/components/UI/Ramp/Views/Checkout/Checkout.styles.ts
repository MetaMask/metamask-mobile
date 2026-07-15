import { StyleSheet } from 'react-native';
import { Theme, AppThemeKey } from '../../../../../util/theme/models';
import { colors } from '../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const isDark = params.theme.themeAppearance === AppThemeKey.dark;
  return StyleSheet.create({
    headerWithoutPadding: {
      paddingVertical: 0,
    },
    webview: {
      backgroundColor: isDark
        ? colors.transakBackgroundDark
        : colors.transakBackgroundLight,
    },
  });
};

export default styleSheet;
