import { StyleSheet } from 'react-native';
import { Colors, AppThemeKey } from '../../../util/theme/models';
import { isPureBlackEnabled } from '../../../util/theme/themeUtils';

/**
 * @param colors - Theme colors object
 * @param themeAppearance - Current theme appearance
 * @returns StyleSheet object with all component styles
 */
export const createStyles = (colors: Colors, themeAppearance?: AppThemeKey) =>
  StyleSheet.create({
    suggestionContainer: {
      // Tighter vertical rhythm and align with page horizontal padding
      paddingVertical: 8,
      paddingLeft: 16,
      paddingRight: 16,
      // In Pure Black dark mode, ensure the bar sits on true black to avoid
      // an elevated/raised strip behind the chips.
      backgroundColor:
        isPureBlackEnabled && themeAppearance === AppThemeKey.dark
          ? colors.background.default
          : colors.background.section,
    },
    suggestionListContent: {
      alignItems: 'center' as const,
    },
    suggestionButton: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      marginRight: 12,
      borderRadius: 8,
      minWidth: 60,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.background.subsection,
    },
    suggestionPressed: {
      opacity: 0.7,
    },
  });
