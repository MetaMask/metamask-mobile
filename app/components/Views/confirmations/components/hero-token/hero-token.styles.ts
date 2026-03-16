import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isFullScreenConfirmation: boolean };
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
  });
};

export default styleSheet;
