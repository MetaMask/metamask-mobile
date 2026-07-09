// Third party dependencies.
import { StyleSheet, Dimensions } from 'react-native';
import { AppThemeKey, Theme } from '../../../util/theme/models';

import {
  TOAST_ACTION_MARGIN_TOP,
  TOAST_CLOSE_MARGIN_TOP,
  TOAST_DESCRIPTION_MARGIN_TOP,
  TOAST_PADDING_BOTTOM_WITH_ACTION,
  TOAST_PADDING_HORIZONTAL,
  TOAST_PADDING_RIGHT_WITH_CLOSE_ICON,
  TOAST_PADDING_TOP_WITHOUT_DESCRIPTION,
  TOAST_PADDING_VERTICAL,
  TOAST_ICON_BACKGROUND_SIZE,
  TOAST_ROW_GAP,
} from './Toast.constants';

const marginWidth = 16;
const toastWidth = Dimensions.get('window').width - marginWidth * 2;

/**
 * Style sheet for Toast component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, shadows } = theme;
  return StyleSheet.create({
    base: {
      position: 'absolute',
      width: toastWidth,
      left: marginWidth,
      top: 0,
      backgroundColor:
        theme.themeAppearance === AppThemeKey.light
          ? colors.background.default
          : colors.background.section,
      ...(theme.themeAppearance === AppThemeKey.light ? shadows.size.md : {}),
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 16,
      paddingTop: TOAST_PADDING_VERTICAL,
      paddingBottom: TOAST_PADDING_VERTICAL,
      paddingLeft: TOAST_PADDING_HORIZONTAL,
      paddingRight: TOAST_PADDING_HORIZONTAL,
      flexDirection: 'row',
      alignItems: 'center',
      gap: TOAST_ROW_GAP,
    },
    labelsContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    labelsContainerTopAligned: {
      justifyContent: 'flex-start',
    },
    iconBackground: {
      width: TOAST_ICON_BACKGROUND_SIZE,
      height: TOAST_ICON_BACKGROUND_SIZE,
      borderRadius: TOAST_ICON_BACKGROUND_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    baseWithoutDescription: {
      paddingTop: TOAST_PADDING_TOP_WITHOUT_DESCRIPTION,
    },
    baseTopAligned: {
      alignItems: 'flex-start',
    },
    baseWithActionButton: {
      paddingBottom: TOAST_PADDING_BOTTOM_WITH_ACTION,
    },
    baseWithCloseIconButton: {
      paddingRight: TOAST_PADDING_RIGHT_WITH_CLOSE_ICON,
    },
    label: {
      color: colors.text.default,
    },
    description: {
      marginTop: TOAST_DESCRIPTION_MARGIN_TOP,
    },
    actionButton: {
      marginTop: TOAST_ACTION_MARGIN_TOP,
    },
    closeButton: {
      marginTop: TOAST_CLOSE_MARGIN_TOP,
    },
    trailingActionButton: {
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
