import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    optionsList: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 8,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 56,
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 8,
    },
  });
};
