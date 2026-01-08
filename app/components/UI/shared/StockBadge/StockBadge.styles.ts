import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    stockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      width: 60,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      gap: 4,
    },
  });
};

export default styleSheet;
