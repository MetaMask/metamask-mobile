import { StyleSheet } from 'react-native';
import { AppThemeKey, type Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors, shadows } = params.theme;

  return StyleSheet.create({
    // Toast container - positioned at top of screen
    container: {
      position: 'absolute',
      top: 74,
      left: 12,
      right: 12,
      zIndex: 9999,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
      backgroundColor:
        params.theme.themeAppearance === AppThemeKey.light
          ? colors.background.default
          : colors.background.section,
      ...(params.theme.themeAppearance === AppThemeKey.light
        ? shadows.size.md
        : {}),
    },
    iconContainer: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    textContainer: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    description: {
      marginTop: 2,
    },
    retryButton: {
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.background.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
