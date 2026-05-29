import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (_params: { theme: Theme }) => {
  const { theme } = _params;

  return StyleSheet.create({
    container: {
      paddingVertical: 8,
      marginBottom: 8,
    },
    scrollContent: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 99,
      backgroundColor: theme.colors.background.muted,
    },
    pillPressed: {
      opacity: 0.7,
    },
    pillLabel: {
      color: theme.colors.text.default,
    },
  });
};
