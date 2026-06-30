import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      paddingBottom: 24,
    },
    scrollContainer: {
      marginTop: 12,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },
    columnLayout: {
      flexDirection: 'column',
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.background.default,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      gap: 6,
    },
    pillPressed: {
      opacity: 0.7,
    },
  });
};
