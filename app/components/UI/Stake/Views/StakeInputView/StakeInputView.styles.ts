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
    inputContainer: {
      flex: 1,
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
    },
    amountRow: {
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    amountContainer: {
      alignItems: 'center',
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
