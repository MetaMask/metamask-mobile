// Third party dependencies.
import { StyleSheet, Dimensions } from 'react-native';
import { AppThemeKey, Theme } from '../../../util/theme/models';

const marginWidth = 16;
const toastWidth = Dimensions.get('window').width - marginWidth * 2;

const TOAST_SPACING = {
  paddingVertical: 12,
  paddingTopWithoutDescription: 10,
  paddingBottomWithAction: 16,
  paddingHorizontal: 16,
  paddingRightWithCloseIcon: 8,
  rowGap: 16,
  iconBackgroundSize: 32,
  actionMarginTop: 8,
  descriptionMarginTop: 2,
  closeMarginTop: -4,
} as const;

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
      paddingTop: TOAST_SPACING.paddingVertical,
      paddingBottom: TOAST_SPACING.paddingVertical,
      paddingLeft: TOAST_SPACING.paddingHorizontal,
      paddingRight: TOAST_SPACING.paddingHorizontal,
      flexDirection: 'row',
      alignItems: 'center',
      gap: TOAST_SPACING.rowGap,
    },
    labelsContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    labelsContainerTopAligned: {
      justifyContent: 'flex-start',
    },
    iconBackground: {
      width: TOAST_SPACING.iconBackgroundSize,
      height: TOAST_SPACING.iconBackgroundSize,
      borderRadius: TOAST_SPACING.iconBackgroundSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    baseWithoutDescription: {
      paddingTop: TOAST_SPACING.paddingTopWithoutDescription,
    },
    baseTopAligned: {
      alignItems: 'flex-start',
    },
    baseWithActionButton: {
      paddingBottom: TOAST_SPACING.paddingBottomWithAction,
    },
    baseWithCloseIconButton: {
      paddingRight: TOAST_SPACING.paddingRightWithCloseIcon,
    },
    label: {
      color: colors.text.default,
    },
    description: {
      marginTop: TOAST_SPACING.descriptionMarginTop,
    },
    actionButton: {
      marginTop: TOAST_SPACING.actionMarginTop,
    },
    closeButton: {
      marginTop: TOAST_SPACING.closeMarginTop,
    },
    trailingActionButton: {
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
