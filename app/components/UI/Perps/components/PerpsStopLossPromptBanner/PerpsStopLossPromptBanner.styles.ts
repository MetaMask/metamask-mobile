import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    stopLossCard: {
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      padding: 12,
    },
    stopLossRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stopLossTextContainer: {
      flex: 1,
      gap: 2,
    },
    button: {
      minWidth: 60,
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
