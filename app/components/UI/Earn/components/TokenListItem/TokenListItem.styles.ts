import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    leftContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    textContainer: {
      marginLeft: 12,
    },
  });
};

export default styleSheet;
