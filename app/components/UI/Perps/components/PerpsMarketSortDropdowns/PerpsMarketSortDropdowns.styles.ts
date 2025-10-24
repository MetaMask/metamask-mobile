import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
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
    dropdownButtonActive: {
      backgroundColor: theme.colors.primary.muted,
    },
    dropdownButtonPressed: {
      opacity: 0.7,
    },
    dropdownText: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.text.alternative,
    },
    dropdownTextActive: {
      color: theme.colors.primary.default,
      fontWeight: '500',
    },
  });
};
