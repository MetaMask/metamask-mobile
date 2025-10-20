import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 16,
      paddingBottom: 32,
      gap: 12,
    },
    option: {
      flex: 1,
      minWidth: '45%',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionActive: {
      backgroundColor: theme.colors.primary.default,
    },
  });
};
