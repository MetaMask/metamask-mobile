import { Dimensions, StyleSheet } from 'react-native';
import { AppThemeKey, Theme } from '../../../util/theme/models';
import {
  TOAST_CLOSE_MARGIN_TOP,
  TOAST_DESCRIPTION_MARGIN_TOP,
  TOAST_PADDING_HORIZONTAL,
  TOAST_PADDING_RIGHT_WITH_CLOSE_ICON,
  TOAST_PADDING_VERTICAL,
  TOAST_ROW_GAP,
} from '../../components/Toast/Toast.constants';

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
      paddingTop: TOAST_PADDING_VERTICAL,
      paddingBottom: TOAST_PADDING_VERTICAL,
      paddingLeft: TOAST_PADDING_HORIZONTAL,
      paddingRight: TOAST_PADDING_HORIZONTAL,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: TOAST_ROW_GAP,
    },
    baseWithCloseIconButton: {
      paddingRight: TOAST_PADDING_RIGHT_WITH_CLOSE_ICON,
    },
    pressableContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: TOAST_ROW_GAP,
    },
    flashLabel: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    flashTitle: {
      color: colors.text.default,
    },
    flashText: {
      marginTop: TOAST_DESCRIPTION_MARGIN_TOP,
    },
    startAccessoryContainer: {
      alignSelf: 'flex-start',
    },
    closeButton: {
      marginTop: TOAST_CLOSE_MARGIN_TOP,
    },
  });
};

export default styleSheet;
