import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    stakeButtonText: {
      fontSize: 18,
      color: colors.text.alternative,
    },
    rewardsRateContainer: {
      padding: 16,
      paddingBottom: 8,
      borderColor: colors.border.muted,
    },
    reviewButtonContainer: {
      padding: 16,
    },
    keypad: {
      paddingHorizontal: 24,
    },
  });
};

export default styleSheet;
