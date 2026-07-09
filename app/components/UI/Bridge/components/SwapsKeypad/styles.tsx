import { StyleSheet } from 'react-native';
import { AppThemeKey, Theme } from '../../../../../util/theme/models';
import { isPureBlackEnabled } from '../../../../../util/theme/themeUtils';

const isSwapsKeypadPureBlackSurface = (theme: Theme) =>
  isPureBlackEnabled && theme.themeAppearance === AppThemeKey.dark;

export const createSwapsKeypadStyles = (theme: Theme) =>
  StyleSheet.create({
    keypadContainer: {
      alignContent: 'flex-end',
      paddingHorizontal: 16,
      gap: 16,
      paddingTop: 16,
    },
    keypadDialog: {
      marginHorizontal: -1,
      marginBottom: -1,
      borderBottomColor: theme.colors.background.default,
      ...(isSwapsKeypadPureBlackSurface(theme)
        ? {
            backgroundColor: theme.colors.background.default,
            borderColor: theme.colors.background.default,
          }
        : {}),
    },
  });
export const quickPickButtonsStyles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
  },
});
