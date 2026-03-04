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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    textContainer: {
      flex: 1,
    },
    label: {
      color: theme.colors.text.alternative,
      marginBottom: 4,
    },
    amountTextLeft: {
      textAlign: 'left',
    },
    fiatTextLeft: {
      textAlign: 'left',
      color: theme.colors.text.alternative,
    },
    iconContainer: {
      marginLeft: 16,
    },
  });
};

export default styleSheet;
