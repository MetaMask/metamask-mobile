import { StyleSheet } from 'react-native';

import { AppThemeKey, Theme } from '../../../../../../util/theme/models';
import {
  getElevatedSurfaceColor,
  isPureBlackEnabled,
} from '../../../../../../util/theme/themeUtils';
import Device from '../../../../../../util/device';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  const isPureBlackDark =
    isPureBlackEnabled && theme.themeAppearance === AppThemeKey.dark;

  return StyleSheet.create({
    // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens.
    // Drop getElevatedSurfaceColor, isPureBlackEnabled, and AppThemeKey checks.
    modalContainer: {
      backgroundColor: getElevatedSurfaceColor(theme),
      borderWidth: isPureBlackDark ? 1 : 0,
      borderColor: isPureBlackDark ? colors.border.muted : undefined,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
    },
    headerContainer: {
      paddingTop: 16,
    },
    footerButton: {
      flex: 1,
    },
    buttonsContainer: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    buttonDivider: {
      width: 8,
    },
    headerText: {
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
    },
    message: {
      textAlign: 'center',
      padding: 12,
    },
    checkboxContainer: {
      marginTop: 12,
      backgroundColor: theme.colors.error.muted,
      borderRadius: 8,
      marginVertical: 8,
      padding: 16,
      flexDirection: 'row',
    },
    reviewAlertsLink: {
      alignSelf: 'center',
    },
    checkboxText: {
      marginLeft: 8,
      flex: 1,
      color: theme.colors.text.default,
    },
  });
};

export default styleSheet;
