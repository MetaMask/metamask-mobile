import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      borderRadius: 12,
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};

export default styleSheet;
