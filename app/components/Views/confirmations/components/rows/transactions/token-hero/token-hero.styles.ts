import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isFlatConfirmation: boolean };
}) => {
  const { theme, vars } = params;
  const { isFlatConfirmation } = vars;

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
      paddingTop: isFlatConfirmation ? 16 : 0,
    },
  });
};

export default styleSheet;
