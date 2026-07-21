// Third party dependencies.
import { StyleSheet, Dimensions } from 'react-native';
import { AppThemeKey, Theme } from '../../../util/theme/models';

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
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    labelsContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    labelsContainerTopAligned: {
      justifyContent: 'flex-start',
    },
    iconBackground: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    baseWithoutDescription: {
      paddingTop: 10,
    },
    baseTopAligned: {
      alignItems: 'flex-start',
    },
    baseWithActionButton: {
      paddingBottom: 16,
    },
    baseWithCloseIconButton: {
      paddingRight: 8,
    },
    label: {
      color: colors.text.default,
    },
    description: {
      marginTop: 2,
    },
    actionButton: {
      marginTop: 8,
    },
    closeButton: {
      marginTop: -4,
    },
    trailingActionButton: {
      alignSelf: 'center',
    },
    pressableContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
  });
};

export default styleSheet;
