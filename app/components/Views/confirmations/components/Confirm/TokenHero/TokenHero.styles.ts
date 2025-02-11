import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    assetAmountContainer: {
      paddingTop: 4,
    },
    assetAmountText: {
      textAlign: 'center',
    },
    assetFiatConversionContainer: {
    },
    assetFiatConversionText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    },
    networkAndTokenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    networkLogo: {
      width: 48,
      height: 48,
    },
    container:{
      paddingVertical: 8
    }
  });
};

export default styleSheet;
