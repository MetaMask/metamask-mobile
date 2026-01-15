import { StyleSheet, Platform } from 'react-native';
import { Colors } from '../../../util/theme/models';

/**
 * @param colors - Theme colors object
 * @returns StyleSheet object with all component styles
 */
export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    suggestionContainer: {
      paddingVertical: 10,
      paddingLeft: Platform.select({
        ios: 48,
        android: 20,
        default: 48,
      }),
      backgroundColor: colors.background.section,
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
