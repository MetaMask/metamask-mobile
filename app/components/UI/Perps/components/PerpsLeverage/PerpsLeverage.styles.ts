import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    maxLeverage: {
      backgroundColor: theme.colors.background.section,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
  });
};

export default styleSheet;
