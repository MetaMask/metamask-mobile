import type { Theme } from '../../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const stylesSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    estGasFeeCard: {
      borderWidth: 0,
      gap: 16,
      borderRadius: 8,
      justifyContent: 'center',
    },
    // Estimated Gas Fee
    estGasFeeValue: {
      flexDirection: 'row',
      paddingTop: 1,
    },
    foxIcon: {
      paddingRight: 8,
    },
    fiatText: {
      paddingRight: 4,
    },
    ethText: {
      borderBottomWidth: 1,
      borderBottomColor: colors.primary.default,
    },
    estimatedGasTooltipContent: {
      gap: 16,
    },
    gasLearnMoreLink: {
      alignSelf: 'flex-start',
    },
  });
};

export default stylesSheet;
