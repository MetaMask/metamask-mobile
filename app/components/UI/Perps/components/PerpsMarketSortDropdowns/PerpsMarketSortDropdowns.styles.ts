import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    dropdownButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.background.muted,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    dropdownButtonPressed: {
      opacity: 0.7,
    },
    dropdownTextActive: {
      color: theme.colors.primary.default,
      fontWeight: '500',
    },
  });
};
