import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    cardContainer: {
      backgroundColor: theme.colors.background.section,
      borderRadius: 16,
      padding: 16,
      height: '100%',
      justifyContent: 'space-between',
    },
    buyButton: {
      paddingVertical: 0,
      backgroundColor: theme.colors.success.muted,
    },
  });
};

export default styleSheet;
