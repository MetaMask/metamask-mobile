import { StyleSheet } from 'react-native';

import { AppThemeKey, Theme } from '../../../../../../util/theme/models';
import {
  getElevatedSurfaceColor,
  isPureBlackEnabled,
} from '../../../../../../util/theme/themeUtils';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  const isPureBlackDark =
    isPureBlackEnabled && theme.themeAppearance === AppThemeKey.dark;

  return StyleSheet.create({
    backIcon: {
      left: 10,
      top: 10,
      position: 'absolute',
    },
    // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens.
    // Drop getElevatedSurfaceColor, isPureBlackEnabled, and AppThemeKey checks.
    container: {
      backgroundColor: getElevatedSurfaceColor(theme),
      borderWidth: isPureBlackDark ? 1 : 0,
      borderColor: isPureBlackDark ? colors.border.muted : undefined,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    text: {
      ...fontStyles.normal,
    },
    tooltipHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    tooltipContext: {
      paddingHorizontal: 40,
      paddingTop: 40,
      paddingBottom: 56,
    },
  });
};

export default styleSheet;
