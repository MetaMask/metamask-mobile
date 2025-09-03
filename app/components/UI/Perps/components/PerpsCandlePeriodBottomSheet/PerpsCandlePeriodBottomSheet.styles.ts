import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      paddingTop: 8,
    },
    periodOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    periodOptionActive: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    checkIcon: {
      marginLeft: 8,
    },
    periodOptionLast: {
      marginBottom: 0,
    },
  });
};

export default styleSheet;
