import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    isFullScreenConfirmation: boolean;
    layout?: 'default' | 'horizontal';
  };
}) => {
  const { theme, vars } = params;
  const { isFullScreenConfirmation } = vars;

  return StyleSheet.create({
    assetAmountContainer: {
      paddingTop: 4,
    },
    assetAmountText: {
      textAlign: 'center',
      paddingTop: 12,
    },
    assetTextUnknown: {
      color: theme.colors.text.alternative,
    },
    assetFiatConversionText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    },
    container: {
      paddingBottom: 16,
      paddingTop: isFullScreenConfirmation ? 16 : 0,
    },
    horizontalContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 0,
      paddingTop: 12,
      paddingBottom: 24,
    },
    textColumn: {
      flex: 1,
    },
    amountIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    amountFiatColumn: {
      flex: 1,
    },
    label: {
      color: theme.colors.text.alternative,
    },
    amountTextLeft: {
      textAlign: 'left',
    },
    fiatTextLeft: {
      textAlign: 'left',
      color: theme.colors.text.alternative,
      marginTop: 4,
    },
    iconContainer: {
      marginLeft: 16,
    },
  });
};

export default styleSheet;
