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
    container: {
      paddingBottom: 8,
      paddingTop: 16,
    },
  });
};

export default styleSheet;
