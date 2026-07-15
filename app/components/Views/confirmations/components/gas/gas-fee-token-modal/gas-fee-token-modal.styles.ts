import { StyleSheet } from 'react-native';
import { AppThemeKey, Theme } from '../../../../../../util/theme/models';
import {
  getElevatedSurfaceColor,
  isPureBlackEnabled,
} from '../../../../../../util/theme/themeUtils';

const styleSheet = (params: {
  theme: Theme;
  vars: { noMargin?: boolean; isSelected?: boolean };
}) => {
  const { theme, vars } = params;
  const { noMargin, isSelected } = vars;
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
      borderTopRightRadius: 16,
      borderTopLeftRadius: 16,
      paddingBottom: 16,
    },
    titleText: {
      marginLeft: noMargin ? 0 : 4,
      marginTop: 12,
      marginBottom: 12,
    },
    nativeToggleIcon: {
      margin: 2,
    },
    nativeToggleIconImg: {
      margin: 8,
    },
    container: {
      position: 'relative',
      flexDirection: 'row',
      paddingTop: 8,
    },
    backButton: {
      position: 'absolute',
      left: 0,
      top: 24,
      zIndex: 1,
    },
    title: {
      color: theme.colors.text.default,
      textAlign: 'center',
      flex: 1,
      padding: 16,
    },
    titlePayETH: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      marginInline: 4,
      flexDirection: 'row',
    },
    contentContainer: {
      display: 'flex',
      flexDirection: 'column',
      paddingLeft: 0,
      paddingRight: 0,
    },
    nativeToggleContainer: {
      display: 'flex',
      flexDirection: 'row',
      borderStyle: 'solid',
      borderColor: theme.colors.border.muted,
      borderRadius: 6,
    },
    gasFeeTokenListItem: {
      position: 'relative',
      width: '100%',
    },
    gasFeeTokenListItemSelected: {
      position: 'relative',
      width: '100%',
    },
    gasFeeTokenListItemSelectedIndicator: {
      width: 4,
      position: 'absolute',
      top: 4,
      left: 4,
      backgroundColor: theme.colors.primary.default,
    },
    nativeToggleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      backgroundColor: isSelected
        ? theme.colors.primary.muted
        : theme.colors.background.muted,
      marginRight: 8,
    },
  });
};

export default styleSheet;
