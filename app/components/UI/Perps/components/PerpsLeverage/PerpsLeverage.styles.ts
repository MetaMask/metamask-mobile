import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    maxLeverage: {
      backgroundColor: theme.colors.background.section,
      paddingVertical: 1,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
  });
};

export default styleSheet;
