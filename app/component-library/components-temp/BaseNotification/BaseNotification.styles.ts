import { Dimensions, StyleSheet } from 'react-native';
import { AppThemeKey, Theme } from '../../../util/theme/models';
import {
  NOTIFICATION_CLOSE_MARGIN_TOP,
  NOTIFICATION_DESCRIPTION_MARGIN_TOP,
  NOTIFICATION_PADDING_HORIZONTAL,
  NOTIFICATION_PADDING_RIGHT_WITH_CLOSE_ICON,
  NOTIFICATION_PADDING_VERTICAL,
  NOTIFICATION_ROW_GAP,
} from './BaseNotification.constants';

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
      backgroundColor:
        theme.themeAppearance === AppThemeKey.light
          ? colors.background.default
          : colors.background.section,
      ...(theme.themeAppearance === AppThemeKey.light ? shadows.size.md : {}),
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
      paddingTop: NOTIFICATION_PADDING_VERTICAL,
      paddingBottom: NOTIFICATION_PADDING_VERTICAL,
      paddingLeft: NOTIFICATION_PADDING_HORIZONTAL,
      paddingRight: NOTIFICATION_PADDING_HORIZONTAL,
      flexDirection: 'row',
      alignItems: 'center',
      gap: NOTIFICATION_ROW_GAP,
    },
    baseTopAligned: {
      alignItems: 'flex-start',
    },
    baseWithCloseIconButton: {
      paddingRight: NOTIFICATION_PADDING_RIGHT_WITH_CLOSE_ICON,
    },
    pressableContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: NOTIFICATION_ROW_GAP,
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
      marginTop: NOTIFICATION_DESCRIPTION_MARGIN_TOP,
    },
    closeButton: {
      marginTop: NOTIFICATION_CLOSE_MARGIN_TOP,
    },
  });
};

export default styleSheet;
