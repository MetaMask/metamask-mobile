import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    maxLeverage: {
      backgroundColor: theme.colors.background.muted,
      paddingHorizontal: 6,
      borderRadius: 6,
      flexShrink: 0,
    },
  });
};

export default styleSheet;
