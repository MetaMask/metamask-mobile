import { StyleSheet } from 'react-native';

import { AppThemeKey, Theme } from '../../../../../../util/theme/models';
import {
  getElevatedSurfaceColor,
  isPureBlackEnabled,
} from '../../../../../../util/theme/themeUtils';

const styleSheet = (params: {
  theme: Theme;
  vars: { isCompact: boolean | undefined };
}) => {
  const { theme, vars } = params;
  const { isCompact } = vars;
  const { colors } = theme;
  const isPureBlackDark =
    isPureBlackEnabled && theme.themeAppearance === AppThemeKey.dark;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isCompact ? 0 : 16,
      marginBottom: isCompact ? 0 : 8,
    },
    // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens.
    // Drop getElevatedSurfaceColor, isPureBlackEnabled, and AppThemeKey checks.
    modalContent: {
      backgroundColor: getElevatedSurfaceColor(theme),
      borderWidth: isPureBlackDark ? 1 : 0,
      borderColor: isPureBlackDark ? colors.border.muted : undefined,
      paddingBottom: 34,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    modalExpandedContent: {
      paddingHorizontal: 16,
    },
    copyButtonContainer: {
      position: 'absolute',
      top: 6,
      right: 18,
      zIndex: 1,
    },
  });
};

export default styleSheet;
