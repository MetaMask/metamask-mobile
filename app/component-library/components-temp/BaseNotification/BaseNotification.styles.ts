import { Dimensions, StyleSheet } from 'react-native';
import { AppThemeKey, Theme } from '../../../util/theme/models';
import { NOTIFICATION_OVERLAY_ELEVATION } from './BaseNotification.constants';
const marginWidth = 16;
const notificationWidth = Dimensions.get('window').width - marginWidth * 2;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, shadows } = theme;

  return StyleSheet.create({
    base: {
      position: 'absolute',
      top: 0,
      left: marginWidth,
      width: notificationWidth,
      zIndex: NOTIFICATION_OVERLAY_ELEVATION,
      elevation: NOTIFICATION_OVERLAY_ELEVATION,
      backgroundColor:
        theme.themeAppearance === AppThemeKey.light
          ? colors.background.default
          : colors.background.section,
      ...(theme.themeAppearance === AppThemeKey.light ? shadows.size.md : {}),
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    baseTopAligned: {
      alignItems: 'flex-start',
    },
    baseWithCloseIconButton: {
      paddingRight: 8,
    },
    pressableContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    pressableContentTopAligned: {
      alignItems: 'flex-start',
    },
    flashLabel: {
      flex: 1,
      justifyContent: 'center',
    },
    flashLabelTopAligned: {
      justifyContent: 'flex-start',
    },
    flashTitle: {
      color: colors.text.default,
    },
    flashText: {
      marginTop: 2,
    },
    closeButton: {
      marginTop: -4,
    },
  });
};

export default styleSheet;
